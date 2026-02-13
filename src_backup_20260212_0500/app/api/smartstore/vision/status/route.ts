import { NextResponse } from 'next/server';
import { getVisionStats } from '@/lib/vision/queue';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// GET: Vision 분석 현황 통계
export async function GET() {
  try {
    await ensureDbInitialized();
    const stats = await getVisionStats();

    // 최근 분석 결과 20건
    const { rows: recentResults } = await db.query(
      `SELECT origin_product_no, vision_brand, vision_clothing_type, vision_grade,
              vision_confidence, merged_confidence, analysis_status, error_message,
              updated_at
       FROM product_vision_analysis
       ORDER BY updated_at DESC
       LIMIT 20`
    );

    return NextResponse.json({ stats, recentResults });
  } catch (error: any) {
    console.error('[Vision/Status] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
