
export interface LifecycleStage {
    stage: 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE';
    daysSince: number;
}

export function calculateLifecycle(regDate: string, overrideDate?: string): LifecycleStage {
    const start = overrideDate ? new Date(overrideDate) : new Date(regDate);
    if (isNaN(start.getTime())) return { stage: 'NEW', daysSince: 0 };

    const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 30) return { stage: 'NEW', daysSince: days };
    if (days <= 60) return { stage: 'CURATED', daysSince: days };
    if (days <= 150) return { stage: 'ARCHIVE', daysSince: days };
    return { stage: 'CLEARANCE', daysSince: days };
}
