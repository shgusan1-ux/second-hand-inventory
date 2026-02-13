'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AdCampaign {
    id: string;
    platform: string;
    cost: number;
    clicks: number;
    sales: number;
    status: 'active' | 'paused' | 'ended';
    date: string;
}

export default function AdManagementPage() {
    const [campaigns, setCampaigns] = useState<AdCampaign[]>([
        { id: '1', platform: 'naver', cost: 150000, clicks: 320, sales: 12, status: 'active', date: '2024-02-01' },
        { id: '2', platform: 'instagram', cost: 80000, clicks: 540, sales: 8, status: 'paused', date: '2024-02-02' },
    ]);

    const [form, setForm] = useState({
        platform: 'naver',
        cost: '',
    });

    const handleAdd = () => {
        if (!form.cost) return;
        const newCamp: AdCampaign = {
            id: Math.random().toString(),
            platform: form.platform,
            cost: Number(form.cost),
            clicks: 0,
            sales: 0,
            status: 'active',
            date: new Date().toISOString().split('T')[0]
        };
        setCampaigns([newCamp, ...campaigns]);
        setForm({ ...form, cost: '' });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">광고 관리</h1>
                <p className="text-slate-500 mt-2">
                    다양한 플랫폼의 광고 집행 내역과 효율을 관리합니다.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-indigo-600" />
                        신규 광고 등록
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end">
                        <div className="space-y-2 w-[200px]">
                            <Label>플랫폼</Label>
                            <Select
                                value={form.platform}
                                onValueChange={(v) => setForm({ ...form, platform: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="naver">네이버 검색광고</SelectItem>
                                    <SelectItem value="instagram">인스타그램</SelectItem>
                                    <SelectItem value="facebook">페이스북</SelectItem>
                                    <SelectItem value="carrot">당근마켓</SelectItem>
                                    <SelectItem value="tiktok">틱톡</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label>일일 예산 / 집행 금액 (원)</Label>
                            <Input
                                type="number"
                                placeholder="예: 50000"
                                value={form.cost}
                                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                            />
                        </div>
                        <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700">광고 추가</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-indigo-600" />
                        광고 집행 현황
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>출고일자</TableHead>
                                <TableHead>플랫폼</TableHead>
                                <TableHead>집행 금액</TableHead>
                                <TableHead>유입수(클릭)</TableHead>
                                <TableHead>전환(판매)</TableHead>
                                <TableHead>ROAS (효율)</TableHead>
                                <TableHead>상태</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns.map((camp) => (
                                <TableRow key={camp.id}>
                                    <TableCell className="font-medium">{camp.date}</TableCell>
                                    <TableCell className="capitalize">{camp.platform}</TableCell>
                                    <TableCell>{camp.cost.toLocaleString()}원</TableCell>
                                    <TableCell>{camp.clicks}</TableCell>
                                    <TableCell>{camp.sales}</TableCell>
                                    <TableCell className={camp.sales > 5 ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                        {camp.cost > 0 ? ((camp.sales * 10000 / camp.cost) * 100).toFixed(0) : 0}%
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${camp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {camp.status === 'active' ? '집행중' : '중지됨'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
