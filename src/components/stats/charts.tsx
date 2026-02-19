'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, AlertCircle, ShoppingBag, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { getDetailedRegistrationStats, getInventoryFlowStats, DetailedRegStats, MonthlyFlowStat } from '@/lib/stats-actions';

export default function StatsCharts() {
    const [stats, setStats] = useState<any>(null);
    const [regStats, setRegStats] = useState<DetailedRegStats | null>(null);
    const [flowStats, setFlowStats] = useState<MonthlyFlowStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        try {
            setLoading(true);
            setError(null);
            setWarning(null);

            // Parallel Fetching: Server Actions + API Route
            const [apiRes, regData, flowData] = await Promise.all([
                fetch('/api/naver/stats').then(res => res.json()),
                getDetailedRegistrationStats(),
                getInventoryFlowStats()
            ]);

            // Handle API Result
            if (apiRes.success) {
                setStats(apiRes.data);
                // Only warn if we truly have NO data (no channels AND no orders)
                // If we have orders but no channel info, that's fine for General Sellers.
                if ((!apiRes.data.channels || apiRes.data.channels.length === 0) && (!apiRes.data.ordersSummary || apiRes.data.ordersSummary.totalCount === 0)) {
                    // setWarning('스마트스토어 채널 정보를 조회할 수 없습니다. (일반 판매자의 경우 상세 실적 조회가 제한될 수 있습니다.)');
                }
            } else {
                // If API fails completely, set warning
                setWarning(apiRes.error || apiRes.message || '스마트스토어 데이터를 가져오지 못했습니다.');
            }

            // Handle DB Stats
            setRegStats(regData);
            setFlowStats(flowData);

        } catch (err: any) {
            setError('데이터 로딩 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const categoryData = stats?.ordersSummary?.statusCounts
        ? Object.entries(stats.ordersSummary.statusCounts).map(([name, value]) => ({ name, value }))
        : [];

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (!mounted) return <div className="h-[300px] w-full bg-slate-50 rounded-md animate-pulse" />;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-slate-500">통계 데이터를 분석 중입니다...</p>
            </div>
        );
    }

    // Default channel info if missing
    const channel = stats?.channels?.[0];

    // Calculate Percent Change for Monthly Reg
    const monthlyChange = regStats && regStats.lastMonthTotal > 0
        ? ((regStats.thisMonthTotal - regStats.lastMonthTotal) / regStats.lastMonthTotal) * 100
        : 0;

    return (
        <div className="space-y-6">
            {/* Top Row: Naver & Channel Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center">
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            채널 정보
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 truncate">
                            {channel ? channel.channelName : 'Brown Street'}
                        </div>
                        <p className="text-xs text-blue-500 mt-1">
                            {channel ? channel.channelServiceType : 'SmartStore (연동됨)'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            최근 30일 주문 (확정)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">
                            {stats?.ordersSummary?.totalCount || 0} 건
                        </div>
                        <p className="text-xs text-emerald-500 mt-1">
                            총액: {(stats?.ordersSummary?.totalAmount || 0).toLocaleString()}원
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            이번 달 등록 현황
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-2xl font-bold text-amber-900">
                                    {regStats?.thisMonthTotal || 0} 개
                                </div>
                                <p className="text-xs text-amber-600 mt-1">
                                    지난달: {regStats?.lastMonthTotal || 0} 개
                                </p>
                            </div>
                            <div className={`text-xs font-bold flex items-center ${monthlyChange >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                {monthlyChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                {Math.abs(monthlyChange).toFixed(1)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Detailed Registration Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">일일 평균 등록 (최근 7일)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{regStats?.weeklyAvg || 0} 개/일</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">일일 평균 등록 (최근 30일)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{regStats?.monthlyAvg || 0} 개/일</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">전체 입고량 (최근 1년)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {flowStats.reduce((acc, curr) => acc + curr.in, 0).toLocaleString()} 개
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">전체 판매량 (최근 1년)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {flowStats.reduce((acc, curr) => acc + curr.out, 0).toLocaleString()} 개
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3 text-red-800">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">오류 발생</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            )}

            {warning && !error && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start space-x-3 text-amber-800">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">확인 필요</p>
                        <p className="text-xs opacity-90">{warning}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Monthly Flow Chart (IN/OUT) */}
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle>월별 입고(IN) vs 판매(OUT) 현황 (최근 12개월)</CardTitle>
                        <CardDescription>가로축: 월 / 세로축: 수량</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flowStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="in" name="입고 (등록)" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="out" name="출고 (판매)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Daily Registration Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>일별 상품 등록 추이 (최근 14일)</CardTitle>
                        <CardDescription>시스템 내부 데이터</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={regStats?.daily || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" name="등록 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Order Status Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>주문 상태 분포 (최근 30일)</CardTitle>
                        <CardDescription>스마트스토어 주문 건수 비중</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', minWidth: 0 }}>
                            {categoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Package className="w-12 h-12 mb-2 opacity-50" />
                                    <p>표시할 주문 데이터가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
