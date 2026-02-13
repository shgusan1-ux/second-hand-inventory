'use client';

import { ContractData } from '@/lib/contract-actions';

interface ContractTemplateProps {
    data: ContractData;
    signatureUrl?: string | null;
    signDate?: string | null;
}

export function ContractTemplate({ data, signatureUrl, signDate }: ContractTemplateProps) {
    if (!data) return <div className="p-8 text-center">데이터 로딩 중...</div>;

    const formattedSalary = data.salaryAmount?.toLocaleString() || '0';

    return (
        <div className="max-w-[210mm] mx-auto bg-white p-8 md:p-12 shadow-sm border text-slate-900 leading-relaxed text-sm">
            <h1 className="text-2xl font-bold text-center mb-8 underline decoration-2 underline-offset-4">표준근로계약서</h1>

            <div className="space-y-6">
                <div>
                    <p className="mb-2">
                        <span className="font-bold underline">{data.companyName}</span> (이하 "사업주"라 함)과(와)
                        <span className="font-bold underline ml-2">{data.employeeName}</span> (이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.
                    </p>
                </div>

                <ol className="list-decimal list-outside pl-5 space-y-4 font-normal">
                    <li>
                        <strong>근로계약기간</strong> : {data.startDate} 부터 {data.endDate ? `${data.endDate} 까지` : '기간의 정함이 없음'}
                    </li>
                    <li>
                        <strong>근무장소</strong> : {data.location}
                    </li>
                    <li>
                        <strong>업무의 내용</strong> : {data.duties} ({data.jobTitle})
                    </li>
                    <li>
                        <strong>소정근로시간</strong> : {data.workStartTime} 부터 {data.workEndTime} 까지 (휴게시간: {data.breakTime})
                    </li>
                    <li>
                        <strong>근무일/휴일</strong> : {data.workDays} 근무
                    </li>
                    <li>
                        <strong>임금</strong> :
                        <span className="ml-1">
                            {data.salaryType}
                            <span className="font-bold mx-1">{formattedSalary}원</span>
                        </span>
                        <br />
                        - 상여금: {data.bonus || '없음'}
                        <br />
                        - 기타급여: {data.benefit || '없음'}
                        <br />
                        - 임금지급일: {data.salaryDate} (휴일의 경우는 전일 지급)
                    </li>
                    <li>
                        <strong>연차유급휴가</strong> : 근로기준법에서 정하는 바에 따른다.
                    </li>
                    <li>
                        <strong>사회보험 적용여부</strong> : ☑ 고용보험 ☑ 산재보험 ☑ 국민연금 ☑ 건강보험
                    </li>
                    <li>
                        <strong>수습기간</strong> : 채용일로부터 3개월 (수습기간 중 급여 100% 지급 또는 별도 협의)
                    </li>
                    <li>
                        <strong>기타</strong> : 이 계약에 정함이 없는 사항은 근로기준법령에 의함.
                    </li>
                </ol>

                <div className="pt-8 mb-8">
                    <p className="text-center mb-4">위와 같이 근로계약을 체결함.</p>
                    <p className="text-center font-bold">{signDate ? signDate : new Date().toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-12">
                    <div className="border p-4 rounded bg-slate-50 h-32 relative">
                        <p className="font-bold mb-2 border-b pb-1">(사업주)</p>
                        <p className="text-xs">상 호 : {data.companyName}</p>
                        <p className="text-xs">대표자 : {data.ceoName} (인)</p>
                        {/* 직인은 생략 또는 이미지 처리 */}
                        <div className="absolute bottom-4 right-4 text-slate-300 font-serif text-2xl opacity-50 border-2 border-slate-300 rounded px-2">
                            서명
                        </div>
                    </div>

                    <div className="border p-4 rounded bg-slate-50 h-32 relative">
                        <p className="font-bold mb-2 border-b pb-1">(근로자)</p>
                        <p className="text-xs">성 명 : {data.employeeName} (인)</p>
                        <p className="text-xs">주 소 : {data.employeeAddress}</p>

                        {signatureUrl ? (
                            <img
                                src={signatureUrl}
                                alt="서명"
                                className="absolute bottom-2 right-2 h-12 mix-blend-multiply opacity-90"
                            />
                        ) : (
                            <div className="absolute bottom-4 right-4 text-xl text-red-500 font-bold border-2 border-red-500 border-dashed rounded px-2 py-1 animate-pulse">
                                본인 서명란
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
