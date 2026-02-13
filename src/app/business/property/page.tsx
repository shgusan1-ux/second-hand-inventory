'use client';

import { useState, useEffect } from 'react';
import { getProperties } from '@/lib/property-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Building, Home, MapPin, Users, DollarSign,
    ArrowRight, PieChart, Plus
} from "lucide-react";
import Link from 'next/link';

export default function PropertyListPage() {
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProperties().then(data => {
            setProperties(data);
            setLoading(false);
        });
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Building': return <Building className="w-5 h-5 text-indigo-600" />;
            case 'Apartment': return <Home className="w-5 h-5 text-emerald-600" />;
            case 'Land': return <MapPin className="w-5 h-5 text-amber-600" />;
            default: return <Building className="w-5 h-5 text-slate-500" />;
        }
    };

    const totalProperties = properties.length;
    const totalUnits = properties.reduce((acc, p) => acc + parseInt(p.unit_count || 0), 0);
    const occupiedUnits = properties.reduce((acc, p) => acc + parseInt(p.occupied_count || 0), 0);
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">부동산 임대 관리</h1>
                    <p className="text-slate-500">보유 자산 및 임대차 계약 현황</p>
                </div>
                <Button className="bg-indigo-600">
                    <Plus className="w-4 h-4 mr-2" /> 자산 등록
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">총 보유 자산</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <Building className="w-5 h-5 text-slate-700" />
                            {totalProperties}건
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">임대 점유율</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            {occupancyRate}% ({occupiedUnits}/{totalUnits})
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">월 예상 임대수익</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            ₩12,500,000 <span className="text-xs text-slate-400 font-normal">(예시)</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Property Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 text-center py-12 text-slate-500">로딩 중...</div>
                ) : (
                    properties.map((prop) => (
                        <Link key={prop.id} href={`/business/property/${prop.id}`}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-slate-200">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            {getTypeIcon(prop.type)}
                                            {prop.name}
                                        </CardTitle>
                                        <CardDescription className="text-xs line-clamp-1">{prop.address}</CardDescription>
                                    </div>
                                    <Badge variant="outline">{prop.type}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 mt-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">총 관리 호실</span>
                                            <span className="font-bold">{prop.unit_count || 0}개</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">임대 중</span>
                                            <span className={`font-bold ${(prop.occupied_count || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {prop.occupied_count || 0}개
                                            </span>
                                        </div>
                                        {prop.type === 'Land' && (
                                            <div className="p-2 bg-amber-50 text-amber-800 text-xs rounded text-center">
                                                토지 자산 (투자용)
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
