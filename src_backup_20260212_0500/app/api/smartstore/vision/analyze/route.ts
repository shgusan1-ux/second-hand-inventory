import { NextRequest, NextResponse } from 'next/server';
import { classifyProductByVision } from '@/lib/vision/gemini-classifier';
import { classifyProduct } from '@/lib/classification';
import { mergeClassifications } from '@/lib/classification/merger';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// Gemini 3 Pro thinking 모드는 응답이 느릴 수 있음
export const maxDuration = 60;

// POST: 단일 상품 Vision 분석
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const originProductNo = body.originProductNo;
    const productName = body.productName || body.name || '';
    // imageUrls 배열 또는 단일 imageUrl 둘 다 지원
    const imageUrls: string[] = body.imageUrls || (body.imageUrl ? [body.imageUrl] : []);

    if (!originProductNo || imageUrls.length === 0 || !productName) {
      return NextResponse.json(
        { error: `필수 파라미터 누락: originProductNo=${!!originProductNo}, images=${imageUrls.length}, name=${!!productName}` },
        { status: 400 }
      );
    }

    console.log(`[Vision/Analyze] 분석 시작: #${originProductNo}`);

    // 1. Vision 분석
    const visionResult = await classifyProductByVision(imageUrls, productName);

    if (!visionResult) {
      // DB에 실패 기록
      await db.query(
        `INSERT INTO product_vision_analysis (origin_product_no, analysis_status, error_message, image_urls, updated_at)
         VALUES ($1, 'failed', 'Gemini 응답 없음', $2, CURRENT_TIMESTAMP)
         ON CONFLICT(origin_product_no) DO UPDATE SET
           analysis_status = 'failed', error_message = 'Gemini 응답 없음', updated_at = CURRENT_TIMESTAMP`,
        [originProductNo, JSON.stringify(imageUrls)]
      );
      return NextResponse.json({ error: 'Vision 분석 실패' }, { status: 500 });
    }

    // 2. DB 저장
    await db.query(
      `INSERT INTO product_vision_analysis
        (origin_product_no, vision_brand, vision_clothing_type, vision_clothing_sub_type,
         vision_gender, vision_grade, vision_grade_reason, vision_color, vision_pattern,
         vision_fabric, vision_size, vision_confidence, image_urls, raw_response,
         analysis_status, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'completed',CURRENT_TIMESTAMP)
       ON CONFLICT(origin_product_no) DO UPDATE SET
         vision_brand=$2, vision_clothing_type=$3, vision_clothing_sub_type=$4,
         vision_gender=$5, vision_grade=$6, vision_grade_reason=$7, vision_color=$8,
         vision_pattern=$9, vision_fabric=$10, vision_size=$11, vision_confidence=$12,
         image_urls=$13, raw_response=$14, analysis_status='completed',
         error_message=NULL, updated_at=CURRENT_TIMESTAMP`,
      [
        originProductNo, visionResult.brand, visionResult.clothingType, visionResult.clothingSubType,
        visionResult.gender, visionResult.grade, visionResult.gradeReason,
        JSON.stringify(visionResult.colors), visionResult.pattern, visionResult.fabric,
        visionResult.size, visionResult.confidence,
        JSON.stringify(imageUrls), JSON.stringify(visionResult)
      ]
    );

    // 3. Text 분류와 merge
    const textResult = classifyProduct(productName);

    // 수동 브랜드 조회
    const { rows: brandRows } = await db.query(
      `SELECT brand_name, brand_name_ko, tier FROM custom_brands WHERE is_active = TRUE AND brand_name = $1`,
      [visionResult.brand || textResult.brand]
    );
    const customBrand = brandRows[0] || null;

    const merged = mergeClassifications(textResult, visionResult, customBrand);

    // merged_confidence 업데이트
    await db.query(
      `UPDATE product_vision_analysis SET merged_confidence = $1 WHERE origin_product_no = $2`,
      [merged.mergedConfidence, originProductNo]
    );

    console.log(`[Vision/Analyze] ✅ #${originProductNo}: ${visionResult.brand} / ${visionResult.grade} / confidence ${merged.mergedConfidence}%`);

    return NextResponse.json({
      success: true,
      data: { vision: visionResult, text: textResult, merged }
    });
  } catch (error: any) {
    console.error('[Vision/Analyze] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
