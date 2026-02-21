import { InventoryManager } from '@/components/inventory/inventory-manager';

// CSR 전환: 서버사이드 DB 쿼리 제거 → 클라이언트에서 React Query로 fetch
// 페이지 이동 시 즉시 렌더 + 캐시된 데이터 먼저 표시 + 백그라운드 갱신
export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <InventoryManager />
        </div>
    );
}
