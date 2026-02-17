'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RotateCcw, Plus, Search, Filter, ArrowUpDown } from 'lucide-react';
import { ReturnForm } from './return-form';
import { Input } from '@/components/ui/input';

export function ReturnManager() {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock data for returns
    const mockReturns = [
        { id: 'RET-001', productId: 'TOP-123', date: '2024-02-15', status: '접수됨', reason: '단순변심', customer: '홍길동' },
        { id: 'RET-002', productId: 'PANTS-456', date: '2024-02-14', status: '검수완료', reason: '사이즈부적합', customer: '김철수' },
        { id: 'RET-003', productId: 'OUTER-789', date: '2024-02-12', status: '재입고완료', reason: '오배송', customer: '이영희' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">반품 관리 시스템</h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500">반품 접수 내역을 확인하고 검수 및 재입고 처리를 관리합니다.</p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-10 sm:h-11">
                            <Plus className="h-4 w-4" />
                            반품 신규 접수
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>새 반품 접수</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <ReturnForm />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-indigo-500" />
                            반품 처리 현황
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 sm:min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="상품코드, 고객명 검색..."
                                    className="pl-9 h-9 text-sm border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                                <Filter className="h-4 w-4 text-slate-500" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100/50 border-y border-slate-100 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-4 py-3">접수번호</th>
                                    <th className="px-4 py-3">상품코드</th>
                                    <th className="px-4 py-3">고객명</th>
                                    <th className="px-4 py-3">사유</th>
                                    <th className="px-4 py-3">접수일</th>
                                    <th className="px-4 py-3">상태</th>
                                    <th className="px-4 py-3 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mockReturns.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{item.id}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.productId}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.customer}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.reason}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{item.date}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={`
                                                ${item.status === '접수됨' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                                                ${item.status === '검수완료' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                                                ${item.status === '재입고완료' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                                            `}>
                                                {item.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700">상세</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {mockReturns.length === 0 && (
                        <div className="py-20 text-center text-slate-400">
                            반품 접수 내역이 없습니다.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
