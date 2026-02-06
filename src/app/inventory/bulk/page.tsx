import { BulkProductForm } from '@/components/inventory/bulk-product-form';

export default function BulkInventoryPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">상품 대량 등록</h1>
                <p className="text-slate-500 mt-2">엑셀 데이터를 복사하여 한 번에 여러 상품을 등록합니다.</p>
            </div>

            <BulkProductForm />
        </div>
    );
}
