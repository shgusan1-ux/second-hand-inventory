import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hammer, FileText, CreditCard, Receipt } from "lucide-react";

export default function BusinessPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">경영지원</h1>
            <p className="text-slate-500">사내 문서, 지출 결의, 비품 관리 등 경영 지원 업무를 관리합니다.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            전자결재 / 문서
                        </CardTitle>
                        <CardDescription>기안서, 휴가계 등 사내 문서 관리</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-500">진행중인 결재: 3건</div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-emerald-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-emerald-500" />
                            지출 관리
                        </CardTitle>
                        <CardDescription>법인카드 사용 내역 및 경비 청구</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-500">이번 달 청구: 12건</div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hammer className="w-5 h-5 text-orange-500" />
                            비품/시설 관리
                        </CardTitle>
                        <CardDescription>사무용품 신청 및 시설 수리 요청</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-500">신청 대기: 0건</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
