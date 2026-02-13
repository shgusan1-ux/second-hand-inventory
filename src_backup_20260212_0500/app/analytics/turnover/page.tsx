import { calculateTurnoverMetrics } from '@/lib/turnover-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, Package, AlertTriangle, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TurnoverDashboard() {
    const metrics = await calculateTurnoverMetrics();

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">회전율 대시보드</h1>
                <p className="text-sm text-slate-500">
                    재고 회전율과 판매 성과를 한눈에 파악하세요
                </p>
            </div>

            {/* 핵심 지표 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            전체 상품
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-900">
                            {metrics.totalProducts.toLocaleString()}
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">
                            활성: {metrics.activeProducts.toLocaleString()}개
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            판매 완료
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">
                            {metrics.soldProducts.toLocaleString()}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                            회전율: {((metrics.soldProducts / metrics.totalProducts) * 100).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            평균 판매 시간
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-900">
                            {metrics.averageDaysToSell}일
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                            중앙값: {metrics.medianDaysToSell}일
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            폐기 추천
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-900">
                            {metrics.discardRecommendations.length}
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                            90일 이상 미판매
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 카테고리별 회전율 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        카테고리별 회전율
                    </CardTitle>
                    <CardDescription>
                        어떤 카테고리가 잘 팔리는지 확인하세요
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-slate-700">카테고리</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">전체</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">판매</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">회전율</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">평균 판매일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {metrics.categoryTurnover.map((cat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{cat.category}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{cat.totalCount}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{cat.soldCount}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cat.turnoverRate >= 50 ? 'bg-emerald-100 text-emerald-700' :
                                                    cat.turnoverRate >= 30 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {cat.turnoverRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {cat.avgDaysToSell > 0 ? `${Math.round(cat.avgDaysToSell)}일` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* 가격대별 회전율 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        가격대별 회전율
                    </CardTitle>
                    <CardDescription>
                        어떤 가격대가 잘 팔리는지 분석하세요
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-slate-700">가격대</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">전체</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">판매</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">회전율</th>
                                    <th className="px-4 py-3 text-right font-medium text-slate-700">평균 판매일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {metrics.priceRangeTurnover.map((range, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{range.priceRange}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{range.totalCount}</td>
                                        <td className="px-4 py-3 text-right text-blue-600 font-semibold">{range.soldCount}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${range.turnoverRate >= 50 ? 'bg-blue-100 text-blue-700' :
                                                    range.turnoverRate >= 30 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {range.turnoverRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {range.avgDaysToSell > 0 ? `${Math.round(range.avgDaysToSell)}일` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* 폐기 추천 상품 */}
            {metrics.discardRecommendations.length > 0 && (
                <Card className="border-orange-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="h-5 w-5" />
                            폐기 추천 상품 (90일 이상 미판매)
                        </CardTitle>
                        <CardDescription>
                            재고 공간 확보를 위해 폐기를 고려해보세요
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-orange-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-orange-700">상품코드</th>
                                        <th className="px-4 py-3 text-left font-medium text-orange-700">상품명</th>
                                        <th className="px-4 py-3 text-left font-medium text-orange-700">카테고리</th>
                                        <th className="px-4 py-3 text-right font-medium text-orange-700">판매가</th>
                                        <th className="px-4 py-3 text-right font-medium text-orange-700">재고일수</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {metrics.discardRecommendations.slice(0, 20).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-orange-50/50">
                                            <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                                            <td className="px-4 py-3 max-w-[300px] truncate">{item.name}</td>
                                            <td className="px-4 py-3 text-slate-600">{item.category}</td>
                                            <td className="px-4 py-3 text-right font-semibold">
                                                ₩{item.price_sell.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                    {item.daysInInventory}일
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
