/**
 * Vision 분석 배치 처리 큐
 * Rate limit: Gemini free tier 15 RPM → 동시 2개, 4초 딜레이
 */

import { classifyProductByVision } from './gemini-classifier';
import { db } from '@/lib/db';
import type { BatchProgress, BatchFailureDetail, GeminiVisionResult } from './types';

interface QueueProduct {
  originProductNo: string;
  name: string;
  imageUrl: string;
  optionalImageUrls?: string[];
}

interface QueueOptions {
  concurrency?: number;
  delayMs?: number;
  onProgress?: (progress: BatchProgress) => void;
}

// 단일 상품 분석 후 DB 저장
async function analyzeAndSave(product: QueueProduct): Promise<boolean> {
  const imageUrls = [product.imageUrl];
  if (product.optionalImageUrls) {
    imageUrls.push(...product.optionalImageUrls.slice(0, 3));
  }

  // DB에 processing 상태 기록
  await db.query(
    `INSERT INTO product_vision_analysis (origin_product_no, analysis_status, image_urls, updated_at)
     VALUES ($1, 'processing', $2, CURRENT_TIMESTAMP)
     ON CONFLICT(origin_product_no) DO UPDATE SET
       analysis_status = 'processing', updated_at = CURRENT_TIMESTAMP`,
    [product.originProductNo, JSON.stringify(imageUrls)]
  );

  try {
    const result = await classifyProductByVision(imageUrls, product.name);

    if (!result) {
      await db.query(
        `UPDATE product_vision_analysis SET
          analysis_status = 'failed', error_message = 'No result from Gemini',
          updated_at = CURRENT_TIMESTAMP
         WHERE origin_product_no = $1`,
        [product.originProductNo]
      );
      return false;
    }

    await db.query(
      `UPDATE product_vision_analysis SET
        vision_brand = $1, vision_clothing_type = $2, vision_clothing_sub_type = $3,
        vision_gender = $4, vision_grade = $5, vision_grade_reason = $6,
        vision_color = $7, vision_pattern = $8, vision_fabric = $9,
        vision_size = $10, vision_confidence = $11,
        image_urls = $12, raw_response = $13,
        analysis_status = 'completed', error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
       WHERE origin_product_no = $14`,
      [
        result.brand, result.clothingType, result.clothingSubType,
        result.gender, result.grade, result.gradeReason,
        JSON.stringify(result.colors), result.pattern, result.fabric,
        result.size, result.confidence,
        JSON.stringify(imageUrls), JSON.stringify(result),
        product.originProductNo
      ]
    );

    console.log(`[Vision] ✅ ${product.originProductNo}: ${result.brand} / ${result.clothingType} / ${result.grade} (${result.confidence}%)`);
    return true;
  } catch (error: any) {
    await db.query(
      `UPDATE product_vision_analysis SET
        analysis_status = 'failed', error_message = $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE origin_product_no = $2`,
      [error.message?.substring(0, 500) || 'Unknown error', product.originProductNo]
    );
    console.error(`[Vision] ❌ ${product.originProductNo}: ${error.message}`);
    return false;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 배치 처리 실행
 */
export async function processBatch(
  products: QueueProduct[],
  options: QueueOptions = {}
): Promise<BatchProgress> {
  const concurrency = options.concurrency || 2;
  const delayMs = options.delayMs || 4000; // Pro 모델은 속도보다 정확성 우선
  const startedAt = new Date().toISOString();

  const failures: BatchFailureDetail[] = [];
  const progress: BatchProgress = {
    total: products.length,
    completed: 0,
    failed: 0,
    startedAt,
    failures
  };

  // 큐 인덱스 관리 (Closure)
  let currentIndex = 0;

  async function worker(workerId: number) {
    while (currentIndex < products.length) {
      // 1. 작업 아이템 가져오기
      const index = currentIndex++;
      if (index >= products.length) break;

      const product = products[index];

      // 2. 시작 보고
      progress.currentProduct = product.name;
      progress.currentProductNo = product.originProductNo;
      options.onProgress?.({ ...progress });

      // 3. 작업 실행 (Pro 모델용 긴 타임아웃)
      try {
        const success = await Promise.race([
          analyzeAndSave(product),
          new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('90초 타임아웃 초과')), 90000))
        ]);

        if (success) {
          progress.completed++;
        } else {
          progress.failed++;
          failures.push({
            productNo: product.originProductNo,
            productName: product.name,
            error: 'Gemini 응답 없음 (No result)',
            timestamp: new Date().toISOString()
          });
        }
      } catch (e: any) {
        progress.failed++;
        failures.push({
          productNo: product.originProductNo,
          productName: product.name,
          error: e?.message || '알 수 없는 오류',
          timestamp: new Date().toISOString()
        });
        console.error(`[Batch] Worker ${workerId} error on ${product.originProductNo}:`, e);
      }

      // 4. 완료 보고
      progress.failures = failures;
      options.onProgress?.({ ...progress, failures: [...failures] });

      // 5. Rate Limit 딜레이 (다음 작업 전 대기)
      if (currentIndex < products.length) {
        await sleep(delayMs);
      }
    }
  }

  // 워커 병렬 실행
  const workers = Array.from({ length: Math.min(concurrency, products.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  return progress;
}

/**
 * DB에서 미분석 상품 목록 조회
 */
export async function getUnanalyzedProducts(): Promise<{ count: number }> {
  // analysis_status가 'completed'가 아니거나 레코드가 없는 상품 수
  const { rows } = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM product_vision_analysis WHERE analysis_status != 'completed'`
  );
  return { count: rows[0]?.count || 0 };
}

/**
 * Vision 분석 통계 조회
 */
export async function getVisionStats() {
  const [totalResult, statusResult, gradeResult, typeResult, avgResult] = await Promise.all([
    db.query<{ count: number }>('SELECT COUNT(*) as count FROM product_vision_analysis'),
    db.query<{ analysis_status: string; count: number }>(
      'SELECT analysis_status, COUNT(*) as count FROM product_vision_analysis GROUP BY analysis_status'
    ),
    db.query<{ vision_grade: string; count: number }>(
      `SELECT vision_grade, COUNT(*) as count FROM product_vision_analysis
       WHERE analysis_status = 'completed' GROUP BY vision_grade`
    ),
    db.query<{ vision_clothing_type: string; count: number }>(
      `SELECT vision_clothing_type, COUNT(*) as count FROM product_vision_analysis
       WHERE analysis_status = 'completed' GROUP BY vision_clothing_type`
    ),
    db.query<{ avg_conf: number }>(
      `SELECT AVG(vision_confidence) as avg_conf FROM product_vision_analysis
       WHERE analysis_status = 'completed'`
    ),
  ]);

  const statusMap: Record<string, number> = {};
  statusResult.rows.forEach(r => { statusMap[r.analysis_status] = r.count; });

  const gradeMap: Record<string, number> = {};
  gradeResult.rows.forEach(r => { if (r.vision_grade) gradeMap[r.vision_grade] = r.count; });

  const typeMap: Record<string, number> = {};
  typeResult.rows.forEach(r => { if (r.vision_clothing_type) typeMap[r.vision_clothing_type] = r.count; });

  return {
    total: totalResult.rows[0]?.count || 0,
    completed: statusMap['completed'] || 0,
    failed: statusMap['failed'] || 0,
    pending: (statusMap['pending'] || 0) + (statusMap['processing'] || 0),
    avgConfidence: Math.round(avgResult.rows[0]?.avg_conf || 0),
    byGrade: gradeMap,
    byClothingType: typeMap,
  };
}
