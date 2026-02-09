import { SmartStoreExhibitionDashboard } from '@/components/smartstore-exhibition-dashboard';

export const dynamic = 'force-dynamic';

export default async function SmartStorePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 underline decoration-indigo-500 decoration-4 underline-offset-8">
                    SmartStore Exhibition Strategy
                </h1>
                <p className="text-slate-500 mt-4 max-w-2xl">
                    네이버 스마트스토어 API를 직접 연동하여 전시대상 상품의 등록일 기준 자동 추천과 전시기능을 관리합니다.
                    수동으로도 언제든 카테고리 이동이 가능합니다.
                </p>
            </div>

            <SmartStoreExhibitionDashboard />
        </div>
    );
}
