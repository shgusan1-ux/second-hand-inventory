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
    Clock, Archive, AlertCircle, CheckCircle2, XCircle, Brain
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

const ARCHIVE_KEYWORDS: Record<string, string[]> = {
    'MILITARY': ['밀리터리', 'military', '군용', '미군', '개파카', 'M65', 'M51', '퍼티그'],
    'WORKWEAR': ['워크웨어', 'workwear', '칼하트', '디키즈', '엔지니어드', '베스트', '커버올', '데님'],
    'JAPAN': ['일본', 'japan', '빔즈', '유나이티드애로우', '니들스', '캐피탈', '포터'],
    'EUROPE': ['유럽', 'europe', '프랑스', '독일', '이탈리아', '빈티지유럽', '바우어'],
    'BRITISH': ['영국', 'british', '바버', '버버리', '해리스트위드', '마가렛호웰', '닥터마틴']
};

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
    const [overrides, setOverrides] = useState<Record<string, { overrideDate?: string, internalCategory?: string }>>({});
    const [visionLog, setVisionLog] = useState<string[]>([]);

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const entry: LogEntry = {
            time: new Date().toLocaleTimeString(),
            message,
            type
        };
        setLogs(prev => [entry, ...prev].slice(0, 50));
    };

    const fetchOverrides = async () => {
        try {
            const res = await fetch('/api/smartstore/classify');
            const result = await res.json();
            if (result.success) setOverrides(result.data);
        } catch (e) {
            console.error('Failed to fetch overrides');
        }
    };

    const saveOverride = async (id: string, data: { overrideDate?: string, internalCategory?: string }) => {
        try {
            const res = await fetch('/api/smartstore/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data })
            });
            if ((await res.json()).success) {
                setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...data } }));
                toast.success('DB 저장 완료');
            }
        } catch (e) {
            toast.error('DB 저장 실패');
        }
    };

    const calculateDays = (product: Product) => {
        const override = overrides[product.originProductNo];
        const dateStr = override?.overrideDate || product.regDate;
        if (!dateStr) return 0;
        try {
            const regDate = new Date(dateStr);
            if (isNaN(regDate.getTime())) return 0;
            const now = new Date();
            const d1 = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
            const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const diff = d2.getTime() - d1.getTime();
            return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
        } catch (e) {
            return 0;
        }
    };

    const getRecommendation = (product: Product) => {
        const override = overrides[product.originProductNo];
        if (override?.internalCategory) return override.internalCategory;

        const days = calculateDays(product);
        if (days <= 30) return 'NEW';
        if (days <= 60) return 'CURATED';
        if (days <= 150) return 'ARCHIVE';
        return 'CLEARANCE';
    };

    const getArchiveScores = (name: string) => {
        const text = name.toLowerCase();
        const scores: Record<string, number> = {};
        Object.entries(ARCHIVE_KEYWORDS).forEach(([cat, keywords]) => {
            let score = 0;
            keywords.forEach(kw => {
                if (text.includes(kw.toLowerCase())) score += 10;
            });
            scores[cat] = score;
        });
        return scores;
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
        fetchOverrides();
        checkConnection();
    }, []);

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
                // Also update internal category if it was a manual move
                if (targetCategory !== 'NEW') {
                    saveOverride(productNo, { internalCategory: targetCategory });
                }
                fetchProducts();
            } else {
                throw new Error(result.error || '이동 실패');
            }
        } catch (e: any) {
            addLog(`[${name}] 이동 실패: ${e.message}`, 'error');
            toast.error(`이동 실패: ${e.message}`);
        }
    };

    const analyzeWithVision = async (imageUrl: string) => {
        setVisionLog(prev => ['분석 중...', ...prev]);
        try {
            const res = await fetch('/api/vision/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl })
            });
            const result = await res.json();
            if (result.success) {
                const labels = result.data.labels.slice(0, 5).map((l: any) => `${l.description}`).join(', ');
                setVisionLog(prev => [`분석 결과: ${labels}`, ...prev]);
                return result.data;
            }
        } catch (e) {
            setVisionLog(prev => [`분석 중 오류`, ...prev]);
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
                    body: JSON.stringify({ productNo: id, categoryIds: catId ? [catId] : [] })
                });
                if ((await res.json()).success) {
                    successCount++;
                    saveOverride(id, { internalCategory: targetCategory });
                } else {
                    failCount++;
                }
            } catch (e) { failCount++; }
        }
        addLog(`일괄 이동 종료 (성공: ${successCount}, 실패: ${failCount})`, 'success');
        setSelectedIds([]);
        fetchProducts();
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sellerManagementCode?.toLowerCase().includes(searchTerm.toLowerCase());
            const rec = getRecommendation(p);
            const matchesFilter = filter === 'ALL' || rec === filter;
            const matchesStock = !stockOnly || p.stockQuantity === 1;
            return matchesSearch && matchesFilter && matchesStock;
        });
    }, [products, searchTerm, filter, stockOnly, overrides]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-4 py-8">
            <div className="xl:col-span-3 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-indigo-600" />
                                스마트스토어 진열 운영툴
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                네이버 스마트스토어 전시 카테고리를 관리하고 AI 분석을 지원합니다.
                                <Badge variant={connectionStatus.direct ? "secondary" : "destructive"} className="text-[10px] h-4">
                                    {connectionStatus.direct ? "📡 API 연결됨" : "❌ API 오류"}
                                </Badge>
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={fetchProducts} disabled={isLoading} variant="outline" size="sm" className="gap-2">
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                새로고침
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="상품명 또는 관리코드 검색..."
                                    className="pl-10 h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="bg-white border rounded px-3 py-2 text-sm h-10"
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
                                    className="h-10"
                                    onClick={() => setStockOnly(!stockOnly)}
                                >
                                    재고 1개만
                                </Button>
                            </div>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm font-semibold text-indigo-700">{selectedIds.length}개 선택됨</span>
                                <Button size="sm" onClick={() => bulkMove('CURATED')} className="bg-indigo-600 h-8">CURATED</Button>
                                <Button size="sm" onClick={() => bulkMove('ARCHIVE')} className="bg-slate-700 h-8">ARCHIVE</Button>
                                <Button size="sm" onClick={() => bulkMove('CLEARANCE')} variant="destructive" className="h-8">CLEARANCE</Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="h-8 ml-auto text-slate-500">취소</Button>
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
                                        <TableHead className="w-16">이미지</TableHead>
                                        <TableHead className="min-w-[200px]">상품명 / 코드</TableHead>
                                        <TableHead>등록일 / 기준일</TableHead>
                                        <TableHead>추천 / 분류</TableHead>
                                        <TableHead className="text-right">전시 분류 액션</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && products.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">불러오는 중...</TableCell></TableRow>
                                    ) : filteredProducts.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">결과가 없습니다.</TableCell></TableRow>
                                    ) : (
                                        filteredProducts.map(p => {
                                            const days = calculateDays(p);
                                            const rec = getRecommendation(p);
                                            const scores = getArchiveScores(p.name);
                                            const override = overrides[p.originProductNo];

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
                                                        <img src={p.images.representativeImage.url} className="w-12 h-12 rounded object-cover border" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm line-clamp-1">{p.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{p.sellerManagementCode || p.originProductNo}</span>
                                                            <div className="flex gap-1 mt-1">
                                                                {Object.entries(scores).filter(([_, s]) => s > 0).map(([c, s]) => (
                                                                    <span key={c} className="text-[9px] px-1 bg-slate-100 text-slate-600 rounded">
                                                                        {c} ({s})
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[11px] text-slate-500">원문: {new Date(p.regDate).toLocaleDateString()}</div>
                                                            <Input
                                                                type="date"
                                                                className="h-6 text-[10px] p-1 w-28"
                                                                value={override?.overrideDate ? new Date(override.overrideDate).toISOString().split('T')[0] : ''}
                                                                onChange={(e) => saveOverride(p.originProductNo, { overrideDate: e.target.value })}
                                                            />
                                                            <span className="text-[10px] font-bold text-indigo-600">{days}일 경과</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="text-[10px] w-fit">추천: {rec}</Badge>
                                                            {override?.internalCategory && (
                                                                <Badge className="text-[10px] w-fit bg-emerald-500">지정: {override.internalCategory}</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <div className="flex gap-1">
                                                                <Button size="icon" variant="outline" className="h-7 w-10 text-[9px]" onClick={() => moveCategory(p.originProductNo, 'NEW', p.name)}>NEW</Button>
                                                                <Button size="icon" variant="outline" className="h-7 w-12 text-[9px] bg-indigo-50" onClick={() => moveCategory(p.originProductNo, 'CURATED', p.name)}>CURATED</Button>
                                                                <Button size="icon" variant="outline" className="h-7 w-12 text-[9px] bg-slate-50" onClick={() => moveCategory(p.originProductNo, 'ARCHIVE', p.name)}>ARCHIVE</Button>
                                                                <Button size="icon" variant="outline" className="h-7 w-12 text-[9px] bg-amber-50" onClick={() => moveCategory(p.originProductNo, 'CLEARANCE', p.name)}>CLEAR</Button>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {['MILITARY', 'WORKWEAR', 'JAPAN', 'EUROPE', 'BRITISH'].map(cat => (
                                                                    <Button key={cat} size="icon" variant="ghost" className="h-6 w-auto px-1.5 text-[8px] border" onClick={() => moveCategory(p.originProductNo, cat, p.name)}>{cat}</Button>
                                                                ))}
                                                                <Button size="icon" variant="ghost" className="h-6 w-8 text-indigo-500" onClick={() => analyzeWithVision(p.images.representativeImage.url)}><Brain className="w-3 h-3" /></Button>
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
                <Card className="h-1/2 overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-900 text-white p-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" /> 실시간 로그
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1 text-[10px]">
                        <div className="divide-y">
                            {logs.map((log, i) => (
                                <div key={i} className={`p-2 ${log.type === 'error' ? 'bg-red-50 text-red-600' : log.type === 'success' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                                    [{log.time}] {log.message}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-1/2 overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-800 text-white p-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="w-4 h-4" /> AI 분석 (Vision)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1 text-[10px] bg-slate-50 font-mono">
                        <div className="p-2 space-y-1">
                            {visionLog.map((line, i) => <div key={i} className="border-l-2 border-slate-300 pl-2 py-1 bg-white mb-1 shadow-sm">{line}</div>)}
                            {visionLog.length === 0 && <div className="text-slate-400 p-4 text-center">상품의 뇌 아이콘을 눌러 분석...</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
