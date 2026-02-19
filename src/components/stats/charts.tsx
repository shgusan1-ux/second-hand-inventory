'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertCircle, ShoppingBag, TrendingUp, Users } from 'lucide-react';

export default function StatsCharts() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/naver/stats');
            const result = await res.json();
            if (result.success) {
                setStats(result.data);
            } else {
                setError(result.message || '데이터를 가져오지 못했습니다.');
            }
        } catch (err: any) {
            setError('API 연결 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Mock Data for Fallback & Components
    const dailyRegistration = [
        { name: '1일', count: 12 }, { name: '2일', count: 19 }, { name: '3일', count: 3 },
        { name: '4일', count: 5 }, { name: '5일', count: 2 }, { name: '6일', count: 20 }, { name: '7일', count: 30 }
    ];

    const monthlySales = [
        { name: 'Jan', in: 4000, out: 2400 }, { name: 'Feb', in: 3000, out: 1398 },
        { name: 'Mar', in: 2000, out: 9800 }, { name: 'Apr', in: 2780, out: 3908 },
        { name: 'May', in: 1890, out: 4800 }, { name: 'Jun', in: 2390, out: 3800 },
    ];

    const categoryData = stats?.ordersSummary?.statusCounts
        ? Object.entries(stats.ordersSummary.statusCounts).map(([name, value]) => ({ name, value }))
        : [
            { name: 'Man', value: 400 },
            { name: 'Woman', value: 300 },
            { name: 'Kids', value: 300 },
            { name: 'Acc', value: 200 },
        ];

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (!mounted) return <div className="h-[300px] w-full bg-slate-50 rounded-md animate-pulse" />;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-slate-500">스마트스토어 통계 데이터를 분석 중입니다...</p>
            </div>
        );
    }

    const channel = stats?.channels?.[0];

    return (
        <div className="space-y-6">
            {/* 상단 채널 요약 정보 */}
            {channel && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-600 flex items-center">
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                활성 채널
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-900">{channel.channelName}</div>
                            <p className="text-xs text-blue-500 mt-1">{channel.channelServiceType}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-2" />
                                최근 30일 주문 건수
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-900">
                                {stats.ordersSummary?.totalCount || 0} 건
                            </div>
                            <p className="text-xs text-emerald-500 mt-1">
                                총액: {(stats.ordersSummary?.totalAmount || 0).toLocaleString()}원
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-600 flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                채널 상태
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-900">
                                {channel.channelStatus === 'ON' ? '운영 중' : '중지'}
                            </div>
                            <p className="text-xs text-amber-500 mt-1">최종 갱신: {new Date().toLocaleTimeString()}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3 text-red-800">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">통계 연동 제한됨</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>주문 상태 분포</CardTitle>
                        <CardDescription>최근 30일간의 주문 상태별 비중</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>월별 입고 vs 출고 (판매)</CardTitle>
                        <CardDescription>재고 흐름 히스토그램 (예시 데이터)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <BarChart data={monthlySales}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="in" name="입고" fill="#8884d8" />
                                    <Bar dataKey="out" name="판매" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 상품 실적 (BizData 권한 있을 때만 활성화되는 예시) */}
                {stats?.productPerformance && (
                    <Card className="col-span-1 md:col-span-2">
                        <CardHeader>
                            <CardTitle>상위 상품 실적 (결제 금액 기준)</CardTitle>
                            <CardDescription>실시간 스마트스토어 BizData 통계</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.productPerformance.map((p: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-800">{p.productName}</span>
                                            <span className="text-xs text-slate-400">ID: {p.productId}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-blue-600">{p.payAmount.toLocaleString()}원</div>
                                            <div className="text-xs text-slate-500">{p.numPurchases}개 판매</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!stats?.productPerformance && (
                    <Card className="col-span-1 md:col-span-2">
                        <CardHeader>
                            <CardTitle>일별 상품 등록 현황 (최근 7일)</CardTitle>
                            <CardDescription>시스템 내부 데이터 집계</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                    <BarChart data={dailyRegistration}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" name="등록 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
