
export default function OnlineManual() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <span className="text-5xl">🎒</span> 초간단 온라인 매뉴얼
            </h1>
            <p className="text-slate-500 mb-10 ml-1">우리 쇼핑몰 관리, 이제 놀이처럼 쉬워져요!</p>

            <div className="grid gap-6">
                {/* 1. 스마트스토어 */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-2xl">🏪</div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4">1. 스마트스토어랑 연결하기</h2>
                    <ul className="space-y-3 text-slate-600 font-medium">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✔</span>
                            <span>내 물건들이 네이버 스마트스토어랑 <b>똑같이</b> 보여요.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✔</span>
                            <span>버튼 하나만 누르면 네이버에 있는 물건 정보를 <b>휘리릭</b> 가져올 수 있어요.</span>
                        </li>
                    </ul>
                </div>

                {/* 2. AI 분류 */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 text-2xl">🤖</div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4">2. 똑똑한 AI 선생님의 도움</h2>
                    <ul className="space-y-3 text-slate-600 font-medium">
                        <li className="flex items-start gap-2">
                            <span className="text-purple-500">✔</span>
                            <span>사진만 올리면 AI 선생님이 <b>"이건 어떤 옷이고, 등급은 상급이에요!"</b>라고 알려줘요.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-500">✔</span>
                            <span>어려운 설명도 AI가 알아서 <b>멋지게</b> 써준답니다.</span>
                        </li>
                    </ul>
                </div>

                {/* 3. 재고 관리 */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-2xl">📦</div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4">3. 내 보물창고(재고) 관리</h2>
                    <ul className="space-y-3 text-slate-600 font-medium">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500">✔</span>
                            <span>지금 우리 창고에 물건이 몇 개 있는지 한눈에 보여요.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500">✔</span>
                            <span>팔린 물건은 <b>'판매완료'</b>라고 표시해서 헷갈리지 않게 해요!</span>
                        </li>
                    </ul>
                </div>

                {/* 4. 매출 관리 */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 text-2xl">💰</div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4">4. 돈 들어오고 나가는 것 보기</h2>
                    <ul className="space-y-3 text-slate-600 font-medium">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500">✔</span>
                            <span>용돈 기입장처럼 <b>얼마를 벌었는지</b> 편하게 볼 수 있어요.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500">✔</span>
                            <span><b>MANAGEMENT HUB</b> 메뉴에서 통장을 쓱쓱 확인해요!</span>
                        </li>
                    </ul>
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between">
                    <div>
                        <p className="font-bold text-lg mb-1">더 궁금한 게 있나요?</p>
                        <p className="text-slate-400 text-sm">오른쪽 아래 채팅창으로 물어보시면 친절히 알려드려요!</p>
                    </div>
                    <span className="text-4xl transform -rotate-12">💌</span>
                </div>
            </div>
        </div>
    );
}
