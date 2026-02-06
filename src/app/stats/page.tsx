'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function StatisticsPage() {
    // Mock Data for Histogram & Trends
    const dailyRegistration = [
        { name: '1일', count: 12 }, { name: '2일', count: 19 }, { name: '3일', count: 3 },
        { name: '4일', count: 5 }, { name: '5일', count: 2 }, { name: '6일', count: 20 }, { name: '7일', count: 30 }
    ];

    const monthlySales = [
        { name: 'Jan', in: 4000, out: 2400 }, { name: 'Feb', in: 3000, out: 1398 },
        { name: 'Mar', in: 2000, out: 9800 }, { name: 'Apr', in: 2780, out: 3908 },
        { name: 'May', in: 1890, out: 4800 }, { name: 'Jun', in: 2390, out: 3800 },
    ];

    const categoryData = [
        { name: 'Man', value: 400 },
        { name: 'Woman', value: 300 },
        { name: 'Kids', value: 300 },
        { name: 'Acc', value: 200 },
    ];
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">통계 분석</h1>
                <p className="text-slate-500 mt-2">
                    입출고 현황, 카테고리별 판매 비율 및 상세 리포트를 확인합니다.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>카테고리별 판매 비율</CardTitle>
                        <CardDescription>Man, Woman, Kids, Acc 비중 분석</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
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
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>월별 입고 vs 출고 (판매)</CardTitle>
                        <CardDescription>재고 흐름 히스토그램</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
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
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle>일별 상품 등록 현황 (최근 7일)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyRegistration}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" name="등록 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
