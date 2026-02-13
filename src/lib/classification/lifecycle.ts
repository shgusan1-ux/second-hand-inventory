
import { getLifecycleSettings } from '@/lib/actions';

export interface LifecycleStage {
    stage: 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE';
    daysSince: number;
    categoryId: string;
    reason: string;
    discountRate: number;
}

export interface LifecycleSettings {
    newDays: number;
    curatedDays: number;
    archiveDays: number;
    curatedDiscount: number;
    archiveDiscount: number;
    clearanceDiscount: number;
}

// 전시 카테고리 ID (환경변수에서 가져오되 기본값 설정)
export const CATEGORY_IDS = {
    CURATED: process.env.CURATED_ID || '4efdba18ec5c4bdfb72d25bf0b8ddcca',
    ARCHIVE_ROOT: process.env.ARCHIVE_ROOT_ID || '14ba5af8d3c64ec592ec94bbc9aad6de',
    CLEARANCE: process.env.CLEARANCE_ID || '09f56197c74b4969ac44a18a7b5f8fb1',
};

export const DEFAULT_LIFECYCLE_SETTINGS: LifecycleSettings = {
    newDays: 30,
    curatedDays: 60,
    archiveDays: 120,
    curatedDiscount: 20,
    archiveDiscount: 20,
    clearanceDiscount: 20,
};

/**
 * DB에서 라이프사이클 설정을 1회 가져옴 (processProducts 전에 사용)
 */
export async function fetchLifecycleSettings(): Promise<LifecycleSettings> {
    try {
        const dbSettings = await getLifecycleSettings();
        if (dbSettings) {
            return {
                newDays: Number(dbSettings.newDays) || 30,
                curatedDays: Number(dbSettings.curatedDays) || 60,
                archiveDays: Number(dbSettings.archiveDays) || 120,
                curatedDiscount: Number(dbSettings.curatedDiscount) || 20,
                archiveDiscount: Number(dbSettings.archiveDiscount) || 20,
                clearanceDiscount: Number(dbSettings.clearanceDiscount) || 20,
            };
        }
    } catch (e) {
        console.warn('[lifecycle] DB 설정 로드 실패, 기본값 사용', e);
    }
    return DEFAULT_LIFECYCLE_SETTINGS;
}

/**
 * 동기 라이프사이클 계산 (1017개 상품 순회 시 DB 쿼리 없이 빠르게 처리)
 * settings는 fetchLifecycleSettings()로 미리 1회만 가져옴
 */
export function calculateLifecycle(regDate: string, overrideDate?: string, settings?: LifecycleSettings): LifecycleStage {
    const s = settings || DEFAULT_LIFECYCLE_SETTINGS;
    const dateStr = overrideDate || regDate;
    if (!dateStr) return { stage: 'NEW', daysSince: 0, categoryId: '', reason: '날짜 정보 없음', discountRate: 0 };

    const startDate = new Date(dateStr);
    if (isNaN(startDate.getTime())) return { stage: 'NEW', daysSince: 0, categoryId: '', reason: '유효하지 않은 날짜', discountRate: 0 };

    const daysSince = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysSince <= s.newDays) {
        return { stage: 'NEW', daysSince, categoryId: '', reason: `${daysSince}일 (NEW: 0-${s.newDays}일)`, discountRate: 0 };
    }
    if (daysSince <= s.curatedDays) {
        return { stage: 'CURATED', daysSince, categoryId: CATEGORY_IDS.CURATED, reason: `${daysSince}일 (CURATED: ${s.newDays+1}-${s.curatedDays}일)`, discountRate: s.curatedDiscount };
    }
    if (daysSince <= s.archiveDays) {
        return { stage: 'ARCHIVE', daysSince, categoryId: CATEGORY_IDS.ARCHIVE_ROOT, reason: `${daysSince}일 (ARCHIVE: ${s.curatedDays+1}-${s.archiveDays}일)`, discountRate: s.archiveDiscount };
    }
    return { stage: 'CLEARANCE', daysSince, categoryId: CATEGORY_IDS.CLEARANCE, reason: `${daysSince}일 (CLEARANCE: ${s.archiveDays}일+)`, discountRate: s.clearanceDiscount };
}
