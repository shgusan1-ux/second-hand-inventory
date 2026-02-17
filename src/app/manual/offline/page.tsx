
export default function OfflineManual() {
    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <h1 className="text-3xl font-black text-slate-900 mb-6">📦 오프라인 재고 관리 메뉴얼</h1>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-3">1. 검수 및 입고 절차</h2>
                    <p className="text-slate-600 leading-relaxed">
                        입고된 중고 의류의 오염, 손상을 확인하고 바코드 시스템에 등록하는 과정입니다.
                    </p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-3">2. 창고 로케이션 관리</h2>
                    <p className="text-slate-600 leading-relaxed">
                        상품의 위치(Shelf, Bin)를 정확히 기록하여 오배송을 방지합니다.
                    </p>
                </section>
                <div className="p-4 bg-orange-50 rounded-2xl text-orange-700 text-sm font-medium">
                    💡 상세 내용은 추후 업데이트 예정입니다.
                </div>
            </div>
        </div>
    );
}
