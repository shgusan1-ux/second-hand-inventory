import { ReturnForm } from '@/components/inventory/return-form';

export default function ReturnsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">반품 관리</h1>
                <p className="text-slate-500 mt-2">
                    반품 접수, 검수 및 재입고 처리를 진행합니다.
                </p>
            </div>

            <ReturnForm />
        </div>
    );
}
