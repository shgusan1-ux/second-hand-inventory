'use client';

import { useState, useEffect } from 'react';
import { getBankAccounts, syncBankAccounts, getFixedCosts, saveFixedCost } from '@/lib/accounting-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw, CreditCard, ArrowUpRight, ArrowDownLeft,
    Settings, Plus, Calculator, Building as Buildings
} from "lucide-react";
import { toast } from 'sonner';

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [fixedCosts, setFixedCosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [accs, costs] = await Promise.all([
            getBankAccounts(),
            getFixedCosts()
        ]);
        setAccounts(accs);
        setFixedCosts(costs);
        setLoading(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        const res = await syncBankAccounts();
        if (res.success) {
            toast.success('계좌 동기화 완료');
            loadData();
        } else {
            toast.error('동기화 실패: ' + res.error);
        }
        setSyncing(false);
    };

    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const getOwnerBadge = (owner: string) => {
        switch (owner) {
            case 'Yudong': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">유동</Badge>;
            case 'HM': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">HM</Badge>;
            case 'Pumeone': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">품에안은</Badge>;
            case '33m2': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">33m2</Badge>;
            default: return <Badge variant="secondary">{owner}</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">통합 자금 관리</h1>
                    <p className="text-slate-500">모든 사업자 계좌 및 고정 지출 현황</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        계좌 동기화
                    </Button>
                    <Button className="gap-2 bg-indigo-600">
                        <Plus className="w-4 h-4" />
                        고정비 등록
                    </Button>
                </div>
            </div>

            {/* 자금 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400">총 보유 잔액</CardDescription>
                        <CardTitle className="text-3xl font-bold">{totalBalance.toLocaleString()}원</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>전일 대비 2.4% 증가</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>이번 달 고정비 예정</CardDescription>
                        <CardTitle className="text-2xl font-bold">
                            {fixedCosts.reduce((s, c) => s + c.amount, 0).toLocaleString()}원
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calculator className="w-4 h-4" />
                            <span>총 {fixedCosts.length}건 대기 중</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>연동 계좌 수</CardDescription>
                        <CardTitle className="text-2xl font-bold">{accounts.length}개</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <CreditCard className="w-4 h-4" />
                            <span>SC제일, NH, KB, IBK</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 계좌 리스트 */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-slate-400" />
                            은행 별 계좌 목록
                        </h2>
                    </div>
                    {loading ? (
                        <div className="p-12 border rounded-lg bg-white flex items-center justify-center text-slate-400">
                            로딩 중...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {accounts.map((acc) => (
                                <Card key={acc.id} className="hover:shadow-md transition-shadow group">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                    {acc.bank_name.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{acc.name}</p>
                                                    <p className="text-xs text-slate-400">{acc.bank_name} · {acc.account_no}</p>
                                                </div>
                                            </div>
                                            {getOwnerBadge(acc.owner_entity)}
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xl font-bold">{acc.balance.toLocaleString()}원</p>
                                            <span className="text-[10px] text-slate-400 italic">
                                                {new Date(acc.updated_at).toLocaleTimeString()} 업데이트
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* 고정비 관리 */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Buildings className="w-5 h-5 text-slate-400" />
                        고정비 지출 예정
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {fixedCosts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        등록된 고정비가 없습니다.
                                    </div>
                                ) : (
                                    fixedCosts.map((cost) => (
                                        <div key={cost.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{cost.name}</p>
                                                <p className="text-xs text-slate-500">매월 {cost.due_day}일 · {cost.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">{cost.amount.toLocaleString()}원</p>
                                                <Badge variant="secondary" className="text-[10px] h-4">D-{cost.due_day - new Date().getDate()}</Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                        <div className="p-4 bg-slate-50 border-t text-center">
                            <Button variant="ghost" size="sm" className="text-xs text-slate-500 h-8">
                                <Settings className="w-3 h-3 mr-1" />
                                고정비 상세 설정
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
