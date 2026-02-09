'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search, RefreshCw, ShoppingBag,
    Clock, Archive, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";
import { toast } from 'sonner';

interface CategoryConfig {
    [key: string]: string;
}

const defaultMap: CategoryConfig = {
    'NEW': '',
    'CURATED': '4efdba18ec5c4bdfb72d25bf0b8ddcca',
    'ARCHIVE': '14ba5af8d3c64ec592ec94bbc9aad6de',
    'CLEARANCE': '09f56197c74b4969ac44a18a7b5f8fb1',
    'MILITARY': '',
    'WORKWEAR': '',
    'JAPAN': '',
    'EUROPE': 'ef5b17e6a0794f7ea73d414cfb1e7e5a',
    'BRITISH': 'b220dc4fcbfb468c865db970e5db9acf'
};

interface Product {
    originProductNo: string;
    channelProductNo: string;
    name: string;
    sellerManagementCode?: string;
    regDate: string;
    salePrice: number;
    stockQuantity: number;
    images: { representativeImage: { url: string } };
    exhibitionCategoryIds: string[];
}

interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

export function SmartStoreExhibitionDashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'NEW' | 'CURATED' | 'ARCHIVE' | 'CLEARANCE'>('ALL');
    const [stockOnly, setStockOnly] = useState(false);
    const [categoryMap, setCategoryMap] = useState<CategoryConfig>(defaultMap);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<{ direct: boolean; proxy: boolean }>({ direct: false, proxy: false });

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const entry: LogEntry = {
            time: new Date().toLocaleTimeString(),
            message,
            type
        };
        setLogs(prev => [entry, ...prev].slice(0, 50));
    };

    const checkConnection = async () => {
        try {
            const res = await fetch('/api/smartstore/products?size=1');
            const result = await res.json();
            setConnectionStatus(prev => ({ ...prev, direct: result.success }));
        } catch (e) {
            setConnectionStatus(prev => ({ ...prev, direct: false }));
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/smartstore/exhibition/config');
            const result = await res.json();
            if (result.success && result.ids) {
                setCategoryMap(prev => ({ ...prev, ...result.ids }));
            }
        } catch (e) {
            console.error('Failed to fetch config');
        }
    };

    const fetchAvailableCategories = async () => {
        try {
            const res = await fetch('/api/smartstore/categories');
            const result = await res.json();
            if (result.success && result.data && result.data.length > 0) {
                setAvailableCategories(result.data);
            } else {
                // Fallback to documented/common names if API fails
                setAvailableCategories([
                    { categoryId: categoryMap['CURATED'], categoryName: 'CURATED (추천)' },
                    { categoryId: categoryMap['ARCHIVE'], categoryName: 'ARCHIVE (보관)' },
                    { categoryId: categoryMap['CLEARANCE'], categoryName: 'CLEARANCE (정리)' },
                    { categoryId: categoryMap['EUROPE'], categoryName: 'EUROPE (유럽)' },
                    { categoryId: categoryMap['BRITISH'], categoryName: 'BRITISH (영국)' }
                ].filter(c => c.categoryId));
            }
        } catch (e) {
            console.error('Failed to fetch available categories');
        }
    };

    const fetchProducts = async () => {
        setIsLoading(true);
        addLog('상품 목록을 불러오는 중...', 'info');
        try {
            const res = await fetch('/api/smartstore/products?size=100');
            const result = await res.json();
            if (result.success && result.data.contents) {
                setProducts(result.data.contents);
                addLog(`${result.data.contents.length}개의 상품을 불러왔습니다.`, 'success');
                setConnectionStatus(prev => ({ ...prev, direct: true }));
            } else {
                throw new Error(result.error || '조회 실패');
            }
        } catch (e: any) {
            addLog(`조회 실패: ${e.message}`, 'error');
            setConnectionStatus(prev => ({ ...prev, direct: false }));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchProducts();
        fetchAvailableCategories();
        checkConnection();
    }, []);

    const calculateDays = (dateStr: string) => {
        const regDate = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - regDate.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const getRecommendation = (days: number) => {
        if (days <= 30) return 'NEW';
        if (days <= 60) return 'CURATED';
        if (days <= 150) return 'ARCHIVE';
        return 'CLEARANCE';
    };

    const moveCategory = async (productNo: string, targetCategory: string, name: string) => {
        const catId = categoryMap[targetCategory];
        if (!catId && targetCategory !== 'NEW') {
            toast.error(`${targetCategory} 카테고리 ID가 설정되지 않았습니다.`);
            return;
        }

        addLog(`[${name}] 항목을 ${targetCategory}로 이동 요청 중...`);
        try {
            const res = await fetch('/api/smartstore/exhibition/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productNo,
                    categoryIds: catId ? [catId] : []
                })
            });
            const result = await res.json();
            if (result.success) {
                addLog(`[${name}] 이동 성공!`, 'success');
                toast.success('이동 완료');
                fetchProducts();
            } else {
                throw new Error(result.error || '이동 실패');
            }
        } catch (e: any) {
            addLog(`[${name}] 이동 실패: ${e.message}`, 'error');
            toast.error(`이동 실패: ${e.message}`);
        }
    };

    const bulkMove = async (targetCategory: string) => {
        if (selectedIds.length === 0) return;

        const count = selectedIds.length;
        addLog(`${count}개 항목을 ${targetCategory}로 일괄 이동을 시작합니다...`, 'info');

        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
            const product = products.find(p => p.originProductNo === id);
            const name = product?.name || id;
            const catId = categoryMap[targetCategory];

            try {
                const res = await fetch('/api/smartstore/exhibition/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productNo: id,
                        categoryIds: catId ? [catId] : []
                    })
                });
                const result = await res.json();
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    addLog(`[${name}] 이동 실패: ${result.error}`, 'error');
                }
            } catch (e: any) {
                failCount++;
                addLog(`[${name}] 오류: ${e.message}`, 'error');
            }
        }

        addLog(`일괄 이동 종료 (성공: ${successCount}, 실패: ${failCount})`, successCount > 0 ? 'success' : 'error');
        setSelectedIds([]);
        fetchProducts();
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sellerManagementCode?.toLowerCase().includes(searchTerm.toLowerCase());

            const days = calculateDays(p.regDate);
            const rec = getRecommendation(days);
            const matchesFilter = filter === 'ALL' || rec === filter;

            const matchesStock = !stockOnly || p.stockQuantity === 1;

            return matchesSearch && matchesFilter && matchesStock;
        });
    }, [products, searchTerm, filter, stockOnly]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-4 py-8">
            <div className="xl:col-span-3 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-indigo-600" />
                                스마트스토어 전시 관리
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                네이버 스마트스토어의 상품 전시 카테고리를 관리합니다.
                                <Badge variant={connectionStatus.direct ? "secondary" : "destructive"} className="text-[10px] h-4">
                                    {connectionStatus.direct ? "📡 API 연결됨" : "❌ IP 차단됨"}
                                </Badge>
                            </CardDescription>
                        </div>
                        <Button onClick={fetchProducts} disabled={isLoading} variant="outline" size="sm" className="gap-2">
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            새로고침
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="상품명 또는 관리코드 검색..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="bg-white border rounded px-3 py-2 text-sm"
                                    value={filter}
                                    onChange={(e: any) => setFilter(e.target.value)}
                                >
                                    <option value="ALL">전체 추천</option>
                                    <option value="NEW">NEW 추천</option>
                                    <option value="CURATED">CURATED 추천</option>
                                    <option value="ARCHIVE">ARCHIVE 추천</option>
                                    <option value="CLEARANCE">CLEARANCE 추천</option>
                                </select>
                                <Button
                                    variant={stockOnly ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStockOnly(!stockOnly)}
                                >
                                    재고 1개만
                                </Button>
                            </div>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm font-semibold text-indigo-700">{selectedIds.length}개 선택됨</span>
                                <Button size="sm" onClick={() => bulkMove('CURATED')} className="bg-indigo-600 hover:bg-indigo-700 h-8">
                                    CURATED 이동
                                </Button>
                                <Button size="sm" onClick={() => bulkMove('ARCHIVE')} className="bg-slate-700 hover:bg-slate-800 h-8">
                                    ARCHIVE 이동
                                </Button>
                                <Button size="sm" onClick={() => bulkMove('CLEARANCE')} variant="destructive" className="h-8">
                                    CLEARANCE 이동
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="h-8 ml-auto text-slate-500">
                                    취소
                                </Button>
                            </div>
                        )}

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedIds(filteredProducts.map(p => p.originProductNo));
                                                    else setSelectedIds([]);
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="w-20">이미지</TableHead>
                                        <TableHead>상품 정보</TableHead>
                                        <TableHead>등록일 / 경과</TableHead>
                                        <TableHead>상태 추천</TableHead>
                                        <TableHead className="text-right">전시 분류 액션</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && products.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">데이터 로딩 중...</TableCell></TableRow>
                                    ) : filteredProducts.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">검색 결과가 없습니다.</TableCell></TableRow>
                                    ) : (
                                        filteredProducts.map(p => {
                                            const days = calculateDays(p.regDate);
                                            const rec = getRecommendation(days);

                                            const recStyles = {
                                                'NEW': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                'CURATED': 'bg-indigo-100 text-indigo-700 border-indigo-200',
                                                'ARCHIVE': 'bg-blue-100 text-blue-700 border-blue-200',
                                                'CLEARANCE': 'bg-amber-100 text-amber-700 border-amber-200'
                                            }[rec];

                                            return (
                                                <TableRow key={p.originProductNo} className={selectedIds.includes(p.originProductNo) ? 'bg-indigo-50/50' : ''}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedIds.includes(p.originProductNo)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) setSelectedIds(prev => [...prev, p.originProductNo]);
                                                                else setSelectedIds(prev => prev.filter(id => id !== p.originProductNo));
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="w-12 h-12 rounded border overflow-hidden bg-slate-100">
                                                            <img src={p.images.representativeImage.url} alt={p.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-900 line-clamp-1">{p.name}</span>
                                                            <span className="text-xs text-slate-500 font-mono">{p.channelProductNo} {p.sellerManagementCode ? `| ${p.sellerManagementCode}` : ''}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm">{new Date(p.regDate).toLocaleDateString()}</span>
                                                            <span className="text-xs font-bold text-slate-400">{days}일 경과</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`font-black ${recStyles}`}>
                                                            {rec}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <div className="flex gap-1">
                                                                <Button size="icon" variant="outline" className="h-7 w-12 text-[10px] font-bold" onClick={() => moveCategory(p.originProductNo, 'NEW', p.name)}>NEW</Button>
                                                                <Button size="icon" variant="outline" className="h-7 w-16 text-[10px] font-bold bg-indigo-50" onClick={() => moveCategory(p.originProductNo, 'CURATED', p.name)}>CURATED</Button>
                                                                <Button size="icon" variant="outline" className="h-7 w-16 text-[10px] font-bold bg-slate-50" onClick={() => moveCategory(p.originProductNo, 'ARCHIVE', p.name)}>ARCHIVE</Button>
                                                                <Button size="icon" variant="outline" className="h-7 w-16 text-[10px] font-bold bg-amber-50" onClick={() => moveCategory(p.originProductNo, 'CLEARANCE', p.name)}>CLEAR</Button>
                                                            </div>
                                                            <div className="flex gap-1 mt-1">
                                                                {['MILITARY', 'WORKWEAR', 'JAPAN', 'EUROPE', 'BRITISH'].map(cat => (
                                                                    <Button
                                                                        key={cat}
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-auto px-2 text-[9px] border hover:bg-slate-100"
                                                                        onClick={() => moveCategory(p.originProductNo, cat, p.name)}
                                                                    >
                                                                        {cat}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="h-full flex flex-col">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            실시간 작업 로그
                        </CardTitle>
                        <CardDescription className="text-slate-400">카테고리 이동 내역 및 결과</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-[400px] overflow-y-auto">
                        <div className="divide-y text-xs">
                            {logs.length === 0 ? (
                                <div className="p-10 text-center text-slate-400">대기 중...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className={`p-3 flex gap-2 ${log.type === 'error' ? 'bg-red-50' :
                                        log.type === 'success' ? 'bg-emerald-50' : ''
                                        }`}>
                                        <span className="text-slate-400 shrink-0">[{log.time}]</span>
                                        <div className="flex flex-col">
                                            <span className={`${log.type === 'error' ? 'text-red-600 font-medium' :
                                                log.type === 'success' ? 'text-emerald-700 font-medium' : 'text-slate-600'
                                                }`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">추천 요약 (계산 결과)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between text-xs"><span>0-30일: NEW</span><Badge variant="outline">추천 1순위</Badge></div>
                        <div className="flex justify-between text-xs"><span>31-60일: CURATED</span><Badge variant="outline">20% 할인 권장</Badge></div>
                        <div className="flex justify-between text-xs"><span>61-150일: ARCHIVE</span><Badge variant="outline">아카이브 보관</Badge></div>
                        <div className="flex justify-between text-xs"><span>151일+: CLEARANCE</span><Badge variant="destructive">최종 정리</Badge></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            전시 카테고리 ID 도우미
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[300px] overflow-y-auto">
                        <div className="space-y-2">
                            {availableCategories.length === 0 ? (
                                <p className="text-[10px] text-slate-400">네이버에 설정된 전시 카테고리가 없습니다.</p>
                            ) : (
                                availableCategories.map((c: any) => (
                                    <div key={c.categoryId} className="flex flex-col border-b pb-1 last:border-0">
                                        <span className="text-[11px] font-bold">{c.categoryName}</span>
                                        <span className="text-[10px] font-mono text-slate-500 select-all">{c.categoryId}</span>
                                    </div>
                                ))
                            )}
                            <p className="text-[9px] text-slate-400 mt-4 leading-tight">
                                * 위 ID들을 복사하여 .env.local 설정에 입력하시면 액션 버튼이 활성화됩니다.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
