'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, RefreshCw, ShoppingBag,
    Filter, LayoutGrid, Brain,
    ArrowRight, Info, AlertCircle
} from "lucide-react";
import { toast } from 'sonner';
import { ProductTable } from "@/components/smartstore/product-table";
import { BulkActions } from "@/components/smartstore/bulk-actions";
import { VisionAnalysis } from "@/components/smartstore/vision-analysis";

export default function SmartStoreManagement() {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [activeVisionData, setActiveVisionData] = useState<any>(null);
    const [filterStatus, setFilterStatus] = useState('ALL');

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setLogs(prev => [{
            time: new Date().toLocaleTimeString(),
            message,
            type
        }, ...prev].slice(0, 50));
    };

    const fetchProducts = async () => {
        setIsLoading(true);
        addLog('상품 목록 동기화 중...', 'info');
        try {
            const res = await fetch(`/api/smartstore/products?name=${encodeURIComponent(searchTerm)}`);
            const result = await res.json();
            if (result.success && result.data.contents) {
                setProducts(result.data.contents);
                addLog(`${result.data.contents.length}개의 상품을 로드했습니다.`, 'success');
            } else {
                throw new Error(result.error || '조회 실패');
            }
        } catch (e: any) {
            addLog(`조리 실패: ${e.message}`, 'error');
            toast.error('상품 로딩 실패');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (filterStatus !== 'ALL' && p.recommendation.category !== filterStatus) return false;
            return true;
        });
    }, [products, filterStatus]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProducts();
    };

    return (
        <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-indigo-600" />
                        스마트스토어 관리 시스템
                    </h1>
                    <p className="text-slate-500 mt-1">AI 기반 자동 분류 및 전시 카테고리 최적화 운영툴</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchProducts} disabled={isLoading} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        전시 카테고리 설정
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: Filters & Logs */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Filter className="w-4 h-4" /> 필터 및 검색
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="상품명/관리코드..."
                                    className="pl-9 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </form>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">라이프사이클 단계</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['ALL', 'NEW', 'CURATED', 'ARCHIVE', 'CLEARANCE'].map(s => (
                                        <Button
                                            key={s}
                                            variant={filterStatus === s ? 'default' : 'outline'}
                                            size="sm"
                                            className="text-[11px] h-8"
                                            onClick={() => setFilterStatus(s)}
                                        >
                                            {s}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-[400px] flex flex-col">
                        <CardHeader className="py-3 bg-slate-50 border-b">
                            <CardTitle className="text-sm font-semibold">운영 로그</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto flex-1 font-mono text-[10px]">
                            <div className="divide-y">
                                {logs.map((log, i) => (
                                    <div key={i} className={`p-2 transition-colors ${log.type === 'error' ? 'bg-red-50 text-red-600' :
                                            log.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                                                'hover:bg-slate-50 text-slate-600'
                                        }`}>
                                        <span className="opacity-50 mr-2">[{log.time}]</span>
                                        {log.message}
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="p-8 text-center text-slate-300 italic">로그 기록이 없습니다.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">
                    <BulkActions
                        selectedCount={selectedIds.length}
                        onClear={() => setSelectedIds([])}
                        onAction={(action) => addLog(`${selectedIds.length}개 항목 ${action} 진행 중...`)}
                    />

                    <ProductTable
                        products={filteredProducts}
                        isLoading={isLoading}
                        selectedIds={selectedIds}
                        onSelectChange={setSelectedIds}
                        onAnalyzeVision={(data) => setActiveVisionData(data)}
                        onUpdate={(id, update) => {
                            addLog(`상품(${id}) 업데이트 완료`, 'success');
                            fetchProducts();
                        }}
                    />
                </div>
            </div>

            {/* Vision Analysis Modal-like Overlay (Simplified for MVP) */}
            {activeVisionData && (
                <VisionAnalysis
                    data={activeVisionData}
                    onClose={() => setActiveVisionData(null)}
                />
            )}
        </div>
    );
}
