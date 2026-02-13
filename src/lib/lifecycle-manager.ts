
import { getLifecycleSettings } from './actions';

export interface LifecycleStage {
    stage: 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE';
    daysSince: number;
    categoryId: string;
    reason: string;
    discountRate: number;
}

// 전시 카테고리 ID (환경변수에서 가져오되 기본값 설정)
const CATEGORY_IDS = {
    CURATED: process.env.CURATED_ID || '4efdba18ec5c4bdfb72d25bf0b8ddcca',
    ARCHIVE_ROOT: process.env.ARCHIVE_ROOT_ID || '14ba5af8d3c64ec592ec94bbc9aad6de',
    CLEARANCE: process.env.CLEARANCE_ID || '09f56197c74b4969ac44a18a7b5f8fb1',
};

const DEFAULT_SETTINGS = {
    newDays: 30,
    curatedDays: 60,
    archiveDays: 120,
    curatedDiscount: 20,
    archiveDiscount: 20,
    clearanceDiscount: 20,
};

export async function calculateLifecycle(regDate: string, overrideDate?: string): Promise<LifecycleStage> {
    const dateStr = overrideDate || regDate;
    if (!dateStr) return { stage: 'NEW', daysSince: 0, categoryId: '', reason: '날짜 정보 없음', discountRate: 0 };

    // Fetch settings from DB (or use defaults)
    let settings = DEFAULT_SETTINGS;
    try {
        const dbSettings = await getLifecycleSettings();
        if (dbSettings) {
            settings = { ...DEFAULT_SETTINGS, ...dbSettings };
        }
    } catch (e) {
        // Fallback to defaults
    }

    const startDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysSince <= settings.newDays) {
        return {
            stage: 'NEW',
            daysSince,
            categoryId: '', // NEW는 별도 전시 카테고리 이동 없음
            reason: `등록일로부터 ${daysSince}일 경과 (0-${settings.newDays}일: NEW)`,
            discountRate: 0
        };
    }

    if (daysSince <= settings.curatedDays) {
        return {
            stage: 'CURATED',
            daysSince,
            categoryId: CATEGORY_IDS.CURATED,
            reason: `등록일로부터 ${daysSince}일 경과 (${settings.newDays + 1}-${settings.curatedDays}일: CURATED)`,
            discountRate: settings.curatedDiscount
        };
    }

    if (daysSince <= settings.archiveDays) {
        return {
            stage: 'ARCHIVE',
            daysSince,
            categoryId: CATEGORY_IDS.ARCHIVE_ROOT,
            reason: `등록일로부터 ${daysSince}일 경과 (${settings.curatedDays + 1}-${settings.archiveDays}일: ARCHIVE)`,
            discountRate: settings.archiveDiscount
        };
    }

    return {
        stage: 'CLEARANCE',
        daysSince,
        categoryId: CATEGORY_IDS.CLEARANCE,
        reason: `등록일로부터 ${daysSince}일 경과 (${settings.archiveDays}일 초과: CLEARANCE)`,
        discountRate: settings.clearanceDiscount
    };
}
