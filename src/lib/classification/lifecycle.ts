
export interface LifecycleStage {
    stage: 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE';
    daysSince: number;
    discount: number; // 할인율 (%)
}

/**
 * 스마트스토어 등록일 기준 라이프사이클 단계 계산
 * NEW: 0-30일 (할인없음)
 * CURATED: 30-60일 (20% 할인)
 * ARCHIVE: 60-120일 (아카이브 분류 적용)
 * CLEARANCE: 120일+ (최종 할인)
 */
export function calculateLifecycle(regDate: string, overrideDate?: string): LifecycleStage {
    const start = overrideDate ? new Date(overrideDate) : new Date(regDate);
    if (isNaN(start.getTime())) return { stage: 'NEW', daysSince: 0, discount: 0 };

    const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 30) return { stage: 'NEW', daysSince: days, discount: 0 };
    if (days < 60) return { stage: 'CURATED', daysSince: days, discount: 20 };
    if (days < 120) return { stage: 'ARCHIVE', daysSince: days, discount: 20 };
    return { stage: 'CLEARANCE', daysSince: days, discount: 20 };
}
