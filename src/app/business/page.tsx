import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart3, CreditCard, Users, Building2, ShoppingBag,
    ArrowRight, Plus, RefreshCw, Smartphone
} from "lucide-react";

export default function BusinessPage() {
    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">경영지원</h1>
                    <p className="text-slate-500 mt-1">통합 자금 관리 및 경영 지원 대시보드</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">계좌 동기화</span>
                    </Button>
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">세금계산서 발행</span>
                    </Button>
                </div>
            </div>

            {/* 주요 메뉴 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <Link href="/business/sales">
                    <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500 group">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart3 className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                월별 매출/매입
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>플랫폼별 매출 확인 및 통합 리포트</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/business/accounts">
                    <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-emerald-500 group">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Smartphone className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                                사업자 계좌
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>오픈뱅킹 연동: 유동, 품에안은, 기업, 33m2</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/business/hr">
                    <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-violet-500 group">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="w-5 h-5 text-violet-500 group-hover:scale-110 transition-transform" />
                                인사 / 급여
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>급여 자동 계산 및 제증명 발급</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/business/property">
                    <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500 group">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                                주택임대관리
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>임대료 수납 확인 및 건물별 관리</CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/business/ecommerce">
                    <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-rose-500 group">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ShoppingBag className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                                이커머스 관리
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>매출/매입 관리 및 세금계산서 발행</CardDescription>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* 오픈뱅킹 요약 (Mockup) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-slate-500" />
                            실시간 계좌 잔액
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: '유동더센트리즈', bank: '기업은행', balance: 12500000, type: '입출금' },
                                { name: '품에안은', bank: '농협', balance: 3420000, type: '입출금' },
                                { name: '삼삼엠투', bank: '카카오뱅크', balance: 890000, type: '모임통장' },
                            ].map((acc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {acc.bank.slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{acc.name}</p>
                                            <p className="text-xs text-slate-500">{acc.bank} · {acc.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-bold text-slate-900">{acc.balance.toLocaleString()}원</p>
                                        <p className="text-xs text-emerald-600 font-medium">정상</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t text-center">
                            <Link href="/business/accounts" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                                전체 계좌 보기 <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-slate-500" />
                            최근 입출금 내역
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0">
                            {[
                                { date: '오늘 14:30', name: '스마트스토어 정산', amount: 450000, type: 'in' },
                                { date: '오늘 11:20', name: '유동 관리비 납부', amount: -120000, type: 'out' },
                                { date: '어제 18:45', name: '쿠팡 정산', amount: 89000, type: 'in' },
                                { date: '어제 09:10', name: '임대료 입금 (김철수)', amount: 550000, type: 'in' },
                            ].map((tx, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-800">{tx.name}</span>
                                        <span className="text-xs text-slate-400">{tx.date}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${tx.type === 'in' ? 'text-blue-600' : 'text-red-500'}`}>
                                        {tx.type === 'in' ? '+' : ''}{tx.amount.toLocaleString()}원
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t text-center">
                            <Link href="/business/accounts" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                                더 보기 <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
