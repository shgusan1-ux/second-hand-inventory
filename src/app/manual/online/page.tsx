
export default function OnlineManual() {
    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <h1 className="text-3xl font-black text-slate-900 mb-6">🌐 온라인 시스템 메뉴얼</h1>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-3">1. 스마트스토어 연동</h2>
                    <p className="text-slate-600 leading-relaxed">
                        나이버 스마트스토어의 API를 연동하여 실시간으로 상품 데이터를 동기화하고 관리할 수 있습니다.
                    </p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-3">2. AI 자동 분류 시스템</h2>
                    <p className="text-slate-600 leading-relaxed">
                        Gemini Vision Pro를 활용하여 이미지를 분석하고 등급 및 카테고리를 자동으로 제안받습니다.
                    </p>
                </section>
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-700 text-sm font-medium">
                    💡 상세 내용은 추후 업데이트 예정입니다.
                </div>
            </div>
        </div>
    );
}
