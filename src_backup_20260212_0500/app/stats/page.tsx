'use client';

import dynamic from 'next/dynamic';

const StatsCharts = dynamic(() => import('@/components/stats/charts'), {
    ssr: false,
    loading: () => <p className="text-slate-500 py-10 text-center">차트 로딩 중...</p>
});

export default function StatisticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">통계 분석</h1>
                <p className="text-slate-500 mt-2">
                    입출고 현황, 카테고리별 판매 비율 및 상세 리포트를 확인합니다.
                </p>
            </div>

            <StatsCharts />
        </div>
    );
}

