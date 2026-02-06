import { getSmartStoreGroups } from '@/lib/data';
import { SmartStoreDashboard } from '@/components/smartstore-dashboard';

export const dynamic = 'force-dynamic';

export default async function SmartStorePage() {
    const groups = await getSmartStoreGroups();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">스마트스토어 전략 관리</h1>
                <p className="text-slate-500 mt-2">
                    설정된 프롬프트 로직에 따라 상품을 자동 분류하고 스마트스토어 연동 전략을 수립합니다.
                </p>
            </div>

            <SmartStoreDashboard groups={groups} />
        </div>
    );
}
