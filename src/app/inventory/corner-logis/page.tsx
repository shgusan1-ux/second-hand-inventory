import { CornerLogisImportForm } from '@/components/inventory/corner-logis-import';

export default function CornerLogisPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">코너로지스 데이터 가져오기</h1>
                <p className="text-slate-500 mt-2">
                    외주 업체(코너로지스)에서 제공받은 원본 데이터를 시스템에 등록합니다.<br />
                    자동으로 <strong>상품코드(ID)</strong>와 <strong>사이즈</strong>가 매핑됩니다.
                </p>
            </div>

            <CornerLogisImportForm />
        </div>
    );
}
