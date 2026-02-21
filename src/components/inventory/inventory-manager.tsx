'use client';

import { useState, Suspense } from 'react';
import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
// XLSX는 ~500KB → 동적 import로 전환 (초기 번들에서 제거)
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download } from 'lucide-react';
import { ProductForm } from './product-form';
import { BulkProductForm } from './bulk-product-form';
import { CornerLogisImportForm } from './corner-logis-import';
import { DiscardedList } from './discarded-list';

// React Query 기반 CSR - 페이지 이동 즉시 렌더 + 캐시된 데이터 먼저 표시
function InventoryManagerInner() {
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkProducts, setBulkProducts] = useState<any[]>([]);
    const [bulkTotalCount, setBulkTotalCount] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [bulkPage, setBulkPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    // URL searchParams → API fetch key
    const apiUrl = `/api/inventory/list?${searchParams.toString()}`;
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const currentLimit = parseInt(searchParams.get('limit') || '50', 10);

    // React Query: 상품 목록 fetch (캐시 + stale-while-revalidate)
    const { data: listData, isLoading: isListLoading, isFetching } = useQuery({
        queryKey: ['inventory-list', searchParams.toString()],
        queryFn: async () => {
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        staleTime: 30 * 1000, // 30초 동안 캐시 신선 유지
        gcTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
        placeholderData: (prev) => prev, // 이전 데이터 유지 (페이지 전환 시 깜빡임 방지)
    });

    // React Query: 카테고리 fetch (5분 캐시)
    const { data: catData } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/inventory/categories');
            const json = await res.json();
            return json.success ? json.data : [];
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    // React Query: 스마트스토어 통계 + 브랜드 (5분 캐시, 별도 API)
    const { data: statsData } = useQuery({
        queryKey: ['inventory-stats'],
        queryFn: async () => {
            const res = await fetch('/api/inventory/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    const categories = catData || [];
    const brands = statsData?.brands || [];
    const products = isBulkMode ? bulkProducts : (listData?.products || []);
    const totalCount = isBulkMode ? bulkTotalCount : (listData?.totalCount || 0);
    const smartstoreStats = statsData?.smartstoreStats;

    const handleBulkSearch = async (codes: string[]) => {
        if (codes.length === 0) {
            handleReset();
            return;
        }

        setIsBulkMode(true);
        setIsLoading(true);

        try {
            const response = await fetch('/api/inventory/bulk-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codes }),
            });

            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            setBulkProducts(data.products);
            setBulkTotalCount(data.totalCount);
            setBulkPage(1);
        } catch (error) {
            console.error('Bulk search error:', error);
            toast.error('대량 검색 중 오류가 발생했습니다.');
            setIsBulkMode(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterSearch = async (params: any) => {
        // 필터 검색 → URL 변경으로 React Query가 자동 refetch
        setIsBulkMode(false);
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (key !== 'excludeCode' && val) urlParams.set(key, String(val));
        });
        urlParams.set('page', '1');
        router.push(`${window.location.pathname}?${urlParams.toString()}`);
    };

    const handleReset = () => {
        setIsBulkMode(false);
        setBulkProducts([]);
        setBulkTotalCount(0);
        setSortConfig(null);
        setBulkPage(1);
        router.push('/inventory/manage');
    };

    const handleExportAll = async () => {
        if (!products || products.length === 0) {
            toast.error('다운로드할 데이터가 없습니다.');
            return;
        }

        toast.info('엑셀 파일 준비 중...');
        const XLSX = await import('xlsx');
        const fileName = `inventory_bulk_all_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const worksheet = XLSX.utils.json_to_sheet(products);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, fileName);
        toast.success(`${products.length}개 상품 다운로드 완료`);
    };

    // Client-side Sorting & Pagination Logic for Bulk Mode
    let visibleProducts = products;
    let currentPageNum = isBulkMode ? bulkPage : currentPage;
    let currentTotal = isBulkMode ? bulkProducts.length : totalCount;

    if (isBulkMode) {
        if (sortConfig) {
            visibleProducts = [...products].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (!aValue && !bValue) return 0;
                if (!aValue) return 1;
                if (!bValue) return -1;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        const startIndex = (bulkPage - 1) * currentLimit;
        visibleProducts = visibleProducts.slice(startIndex, startIndex + currentLimit);
    }

    const handleSort = (key: string) => {
        if (isBulkMode) {
            setSortConfig(current => ({
                key,
                direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
            }));
        } else {
            const params = new URLSearchParams(searchParams.toString());
            const currentSort = params.get('sort');
            const newDirection = currentSort === key ? 'desc' : 'asc';
            params.set('sort', key);
            params.set('order', newDirection);
            router.push(`${window.location.pathname}?${params.toString()}`);
        }
    };

    const handlePageChange = (page: number) => {
        if (isBulkMode) {
            setBulkPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', page.toString());
            router.push(`${window.location.pathname}?${params.toString()}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-black">통합 재고 관리</h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500">상품 정보를 수정, 삭제하거나 대량 업데이트하고 새로운 재고를 등록합니다.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 sm:h-11">
                                <Plus className="h-4 w-4" />
                                <span className="whitespace-nowrap">재고 등록</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <DialogHeader>
                                <DialogTitle>새 재고 등록</DialogTitle>
                            </DialogHeader>
                            <Tabs defaultValue="single" className="w-full mt-4">
                                <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
                                    <TabsTrigger value="single" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">개별 상품 등록</TabsTrigger>
                                    <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">대량 등록 (Excel)</TabsTrigger>
                                    <TabsTrigger value="conor" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">코너로지스 가져오기</TabsTrigger>
                                </TabsList>

                                <TabsContent value="single" className="mt-6">
                                    <div className="bg-white rounded-xl border border-slate-100 p-1">
                                        <ProductForm categories={categories} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="bulk" className="mt-6">
                                    <BulkProductForm />
                                </TabsContent>

                                <TabsContent value="conor" className="mt-6">
                                    <CornerLogisImportForm />
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1 sm:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-10 sm:h-11">
                                <Trash2 className="h-4 w-4" />
                                <span className="whitespace-nowrap">발송 및 폐기 관리</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>발송 및 폐기 상품 목록</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                                <DiscardedList />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        className="flex-1 sm:flex-none border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 h-10 sm:h-11"
                        onClick={async () => {
                            const ids = products.map((p: any) => p.id);
                            if (ids.length === 0) {
                                toast.error('다운로드할 상품이 없습니다.');
                                return;
                            }
                            toast.info(`플레이오토 수정 엑셀 생성 중... (${ids.length}건)`);
                            try {
                                const res = await fetch('/api/inventory/export', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ids }),
                                });
                                if (!res.ok) {
                                    const err = await res.json();
                                    toast.error(err.error || '엑셀 생성 실패');
                                    return;
                                }
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                const disposition = res.headers.get('Content-Disposition') || '';
                                const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
                                a.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'playauto_export.xlsx';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                                toast.success(`플레이오토 수정 엑셀 다운로드 완료! (${ids.length}건)`);
                            } catch (err: any) {
                                toast.error(`다운로드 실패: ${err.message}`);
                            }
                        }}
                    >
                        <Download className="h-4 w-4" />
                        <span className="whitespace-nowrap">플레이오토 수정 엑셀 ({products.length}건)</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50 gap-2 h-10 sm:h-11"
                        onClick={async () => {
                            const ids = products.map((p: any) => p.id);
                            if (ids.length === 0) {
                                toast.error('다운로드할 상품이 없습니다.');
                                return;
                            }
                            toast.info(`플레이오토 신규등록 엑셀 생성 중... (${ids.length}건)`);
                            try {
                                const res = await fetch('/api/inventory/export-new', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ids }),
                                });
                                if (!res.ok) {
                                    const err = await res.json();
                                    toast.error(err.error || '엑셀 생성 실패');
                                    return;
                                }
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                const disposition = res.headers.get('Content-Disposition') || '';
                                const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
                                a.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'playauto_new.xlsx';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                                toast.success(`플레이오토 신규등록 엑셀 다운로드 완료! (${ids.length}건)`);
                            } catch (err: any) {
                                toast.error(`다운로드 실패: ${err.message}`);
                            }
                        }}
                    >
                        <Download className="h-4 w-4" />
                        <span className="whitespace-nowrap">플레이오토 신규 등록 ({products.length}건)</span>
                    </Button>
                </div>
            </div>

            {smartstoreStats && (
                <div className="flex gap-3 text-xs">
                    <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        전체 재고 <span className="font-bold text-slate-900">{smartstoreStats.total.toLocaleString()}</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-medium border border-green-200">
                        스마트스토어 등록상품 <span className="font-bold">{smartstoreStats.registered.toLocaleString()}</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 font-medium border border-orange-200">
                        스토어 판매중지 <span className="font-bold">{smartstoreStats.suspended.toLocaleString()}</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-medium border border-red-200">
                        스토어 품절 <span className="font-bold">{smartstoreStats.outofstock.toLocaleString()}</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                        스토어 미등록 <span className="font-bold">{smartstoreStats.unregistered.toLocaleString()}</span>
                    </span>
                </div>
            )}

            <InventoryFilter
                brands={brands}
                categories={categories}
                onBulkSearch={handleBulkSearch}
                onReset={handleReset}
                onFilterSearch={handleFilterSearch}
                isLoading={isLoading}
            />

            <div className="flex items-center justify-between px-1">
                <div className="text-sm text-slate-600">
                    검색 결과: <span className="font-bold text-slate-900">{currentTotal.toLocaleString()}</span>개
                    {isBulkMode && <span className="ml-2 text-xs text-emerald-600 font-medium">(대량 검색 모드)</span>}
                    {isFetching && !isListLoading && <span className="ml-2 text-xs text-blue-500 font-medium">갱신 중...</span>}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">출력:</span>
                    <select
                        className="h-8 text-xs border rounded px-2 bg-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        value={currentLimit}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('limit', e.target.value);
                            params.set('page', '1');
                            router.push(`${window.location.pathname}?${params.toString()}`);
                        }}
                    >
                        <option value="50">50개씩</option>
                        <option value="100">100개씩</option>
                        <option value="300">300개씩</option>
                        <option value="500">500개씩</option>
                        <option value="1000">1000개씩</option>
                    </select>
                </div>
            </div>

            {isListLoading && !listData ? (
                // 최초 로딩 스켈레톤
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : (
                <InventoryTable
                    products={visibleProducts}
                    totalCount={currentTotal}
                    limit={currentLimit}
                    currentPage={currentPageNum}
                    isEditable={true}
                    categories={categories}
                    onSort={handleSort}
                    onPageChange={handlePageChange}
                    isBulkMode={isBulkMode}
                    onExportAll={isBulkMode ? handleExportAll : undefined}
                />
            )}

            {isLoading && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-xl flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
                        <span className="font-medium">대량 검색 중...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// useSearchParams()는 Suspense boundary가 필요
export function InventoryManager() {
    return (
        <Suspense fallback={
            <div className="space-y-4">
                <div className="h-10 bg-slate-100 animate-pulse rounded-lg w-1/3" />
                <div className="h-12 bg-slate-100 animate-pulse rounded-lg" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
                ))}
            </div>
        }>
            <InventoryManagerInner />
        </Suspense>
    );
}
