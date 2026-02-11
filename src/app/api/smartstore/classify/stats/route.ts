import { NextResponse } from 'next/server';
import { getClassificationStats, getClassificationLog } from '@/lib/classification';

// 교차검증용 분류 통계 + 최근 로그
export async function GET() {
  const stats = getClassificationStats();
  const log = getClassificationLog();

  return NextResponse.json({
    success: true,
    stats,
    // 교차검증용: 최근 50건 샘플
    recentEntries: log.slice(-50).map(e => ({
      productNo: e.productNo,
      name: e.productName,
      brand: e.result.brand,
      brandTier: e.result.brandTier,
      gender: e.result.gender,
      size: e.result.size,
      clothingType: e.result.clothingType,
      clothingSubType: e.result.clothingSubType,
      confidence: e.result.confidence,
      suggestedNaverCategory: e.result.suggestedNaverCategory,
    })),
    totalLogged: log.length,
  });
}
