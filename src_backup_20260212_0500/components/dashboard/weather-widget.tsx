'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Snowflake, MapPin } from 'lucide-react';
import type { MarketWeather } from '@/lib/weather';

const iconMap = {
    'Sunny': <Sun className="h-8 w-8 text-orange-500" />,
    'Cloudy': <Cloud className="h-8 w-8 text-slate-500" />,
    'Rain': <CloudRain className="h-8 w-8 text-blue-500" />,
    'Snow': <Snowflake className="h-8 w-8 text-sky-300" />
};

export function WeatherWidget({ data }: { data: MarketWeather | null }) {
    if (!data) return <Card><CardContent className="p-6 text-center">날씨 정보 로딩 중...</CardContent></Card>;

    return (
        <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    AI 날씨 기반 판매 전략 제안
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
                    <div className="bg-slate-50 p-2 rounded-full">
                        {iconMap[data.dominantCondition]}
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900">{data.averageTemp}°C</div>
                        <div className="text-sm text-slate-500 font-medium">전국 평균 (실시간)</div>
                    </div>
                    <div className="flex-1 text-right">
                        <span className="text-xs text-slate-400">주요 도시 날씨 정보 반영됨</span>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                        <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Today's Strategy</div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">오늘의 전략</h4>
                        <p className="text-xs text-slate-600 leading-relaxed word-keep break-keep">
                            {data.recommendations.today}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                        <div className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Weekly Strategy</div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">이번 주 전략</h4>
                        <p className="text-xs text-slate-600 leading-relaxed word-keep break-keep">
                            {data.recommendations.week}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                        <div className="text-xs font-bold text-purple-600 mb-2 uppercase tracking-wide">Monthly Strategy</div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">이번 달의 전략</h4>
                        <p className="text-xs text-slate-600 leading-relaxed word-keep break-keep">
                            {data.recommendations.month}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
                        <div className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wide">Seasonal Strategy</div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">지금 계절의 전략</h4>
                        <p className="text-xs text-slate-600 leading-relaxed word-keep break-keep">
                            {data.recommendations.season}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
