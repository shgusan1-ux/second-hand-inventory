import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { classifyProduct } from '@/lib/classification';
import { mergeClassifications } from '@/lib/classification/merger';

// GET: 상품 분석 상세 조회 (Vision + Text + Merged)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const originProductNo = searchParams.get('originProductNo');
  const productName = searchParams.get('name') || '';

  if (!originProductNo) {
    return NextResponse.json({ error: '상품번호 필수' }, { status: 400 });
  }

  await ensureDbInitialized();

  // 1. DB에서 Vision 분석 결과 조회
  const { rows } = await db.query(
    `SELECT * FROM product_vision_analysis WHERE origin_product_no = $1`,
    [originProductNo]
  );
  const row = rows[0] || null;

  // 2. 텍스트 분류
  const textResult = await classifyProduct(productName);

  // 3. Vision 결과 빌드
  let visionData = null;
  let visionForMerge = null;
  if (row) {
    visionData = {
      brand: row.vision_brand || '',
      clothingType: row.vision_clothing_type || '',
      clothingSubType: row.vision_clothing_sub_type || '',
      gender: row.vision_gender || '',
      grade: row.vision_grade || '',
      gradeReason: row.vision_grade_reason || '',
      colors: row.vision_color ? JSON.parse(row.vision_color) : [],
      pattern: row.vision_pattern || '',
      fabric: row.vision_fabric || '',
      size: row.vision_size || '',
      confidence: row.vision_confidence || 0,
      imageUrls: row.image_urls ? JSON.parse(row.image_urls) : [],
      analysisStatus: row.analysis_status,
      updatedAt: row.updated_at,
    };

    if (row.analysis_status === 'completed' || row.analysis_status === 'manual') {
      visionForMerge = {
        brand: visionData.brand,
        clothingType: visionData.clothingType || '기타',
        clothingSubType: visionData.clothingSubType,
        gender: visionData.gender || 'UNKNOWN',
        grade: visionData.grade || 'A급',
        gradeReason: visionData.gradeReason,
        colors: visionData.colors,
        pattern: visionData.pattern,
        fabric: visionData.fabric,
        size: visionData.size,
        confidence: visionData.confidence,
      };
    }
  }

  // 4. 수동 브랜드 조회 + 머지
  const brandName = (visionData?.brand || textResult.brand || '').toUpperCase();
  const { rows: brandRows } = await db.query(
    `SELECT brand_name, brand_name_ko, tier FROM custom_brands WHERE is_active = TRUE AND UPPER(brand_name) = $1`,
    [brandName]
  );
  const customBrand = brandRows[0] || null;
  const merged = mergeClassifications(textResult, visionForMerge, customBrand);

  return NextResponse.json({
    success: true,
    data: { vision: visionData, text: textResult, merged }
  });
}

// PUT: 수동 수정 저장
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { originProductNo, productName, ...fields } = body;

  if (!originProductNo) {
    return NextResponse.json({ error: '상품번호 필수' }, { status: 400 });
  }

  await ensureDbInitialized();

  // UPSERT: 모든 필드를 전송받아 저장
  await db.query(
    `INSERT INTO product_vision_analysis
      (origin_product_no, vision_brand, vision_clothing_type, vision_clothing_sub_type,
       vision_gender, vision_grade, vision_grade_reason, vision_color, vision_pattern,
       vision_fabric, vision_size, vision_confidence, analysis_status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual',CURRENT_TIMESTAMP)
     ON CONFLICT(origin_product_no) DO UPDATE SET
       vision_brand=$2, vision_clothing_type=$3, vision_clothing_sub_type=$4,
       vision_gender=$5, vision_grade=$6, vision_grade_reason=$7, vision_color=$8,
       vision_pattern=$9, vision_fabric=$10, vision_size=$11, vision_confidence=$12,
       analysis_status=CASE WHEN product_vision_analysis.analysis_status='completed' THEN 'completed' ELSE 'manual' END,
       updated_at=CURRENT_TIMESTAMP`,
    [
      originProductNo,
      fields.brand || '',
      fields.clothingType || '기타',
      fields.clothingSubType || '',
      fields.gender || 'UNKNOWN',
      fields.grade || 'A급',
      fields.gradeReason || '',
      JSON.stringify(fields.colors || []),
      fields.pattern || '솔리드',
      fields.fabric || '',
      fields.size || '',
      fields.confidence ?? 0,
    ]
  );

  // merged confidence 재계산
  if (productName) {
    const textResult = await classifyProduct(productName);
    const visionResult = {
      brand: fields.brand || '',
      clothingType: fields.clothingType || '기타',
      clothingSubType: fields.clothingSubType || '',
      gender: fields.gender || 'UNKNOWN',
      grade: fields.grade || 'A급',
      gradeReason: fields.gradeReason || '',
      colors: fields.colors || [],
      pattern: fields.pattern || '솔리드',
      fabric: fields.fabric || '',
      size: fields.size || '',
      confidence: fields.confidence ?? 0,
    };
    const brandName = (fields.brand || textResult.brand || '').toUpperCase();
    const { rows: brandRows } = await db.query(
      `SELECT brand_name, brand_name_ko, tier FROM custom_brands WHERE is_active = TRUE AND UPPER(brand_name) = $1`,
      [brandName]
    );
    const customBrand = brandRows[0] || null;
    const merged = mergeClassifications(textResult, visionResult, customBrand);

    await db.query(
      `UPDATE product_vision_analysis SET merged_confidence = $1 WHERE origin_product_no = $2`,
      [merged.mergedConfidence, originProductNo]
    );
  }

  return NextResponse.json({ success: true });
}
