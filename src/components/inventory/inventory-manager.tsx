'use client';

import { useState, useEffect } from 'react';
import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ProductForm } from './product-form';
import { BulkProductForm } from './bulk-product-form';
import { CornerLogisImportForm } from './corner-logis-import';
import { DiscardedList } from './discarded-list';

interface InventoryManagerProps {
    initialProducts: any[];
    initialTotalCount: number;
    initialLimit: number;
    currentPage: number;
    categories: any[];
    brands?: string[];
    smartstoreStats?: { total: number; registered: number; unregistered: number };
}

export function InventoryManager({
    initialProducts,
    initialTotalCount,
    initialLimit,
    currentPage,
    categories,
    brands = [],
    smartstoreStats
}: InventoryManagerProps) {
    const [products, setProducts] = useState(initialProducts);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [bulkPage, setBulkPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    // Reset to initial data when server props change (e.g. normal pagination/filter via URL)
    useEffect(() => {
        if (!isBulkMode) {
            setProducts(initialProducts);
            setTotalCount(initialTotalCount);
        }
    }, [initialProducts, initialTotalCount, isBulkMode]);

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
            setProducts(data.products);
            setTotalCount(data.totalCount);
            setBulkPage(1); // Reset bulk page
        } catch (error) {
            console.error('Bulk search error:', error);
            toast.error('대량 검색 중 오류가 발생했습니다.');
            setIsBulkMode(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterSearch = async (params: any) => {
        setIsLoading(true);
        setIsBulkMode(true);

        try {
            const { searchProducts } = await import('@/lib/actions');
            const results = await searchProducts(params);

            setProducts(results);
            setTotalCount(results.length);
            setBulkPage(1);

            const urlParams = new URLSearchParams();
            Object.entries(params).forEach(([key, val]) => {
                if (key !== 'excludeCode' && val) urlParams.set(key, String(val));
            });
            router.replace(`${window.location.pathname}?${urlParams.toString()}`);

            toast.success(`검색 완료: ${results.length}개`);

        } catch (error) {
            console.error('Filter search error:', error);
            toast.error('검색 중 오류가 발생했습니다.');
            setIsBulkMode(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setIsBulkMode(false);
        setProducts(initialProducts);
        setTotalCount(initialTotalCount);
        setSortConfig(null);
        setBulkPage(1);

        router.push('/inventory');
    };

    const handleExportAll = () => {
        if (!products || products.length === 0) {
            toast.error('다운로드할 데이터가 없습니다.');
            return;
        }

        const fileName = `inventory_bulk_all_${new Date().toISOString().slice(0, 10)}.xlsx`;

        // Use standard XLSX utils
        const worksheet = XLSX.utils.json_to_sheet(products);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, fileName);
        toast.success(`${products.length}개 상품 다운로드 완료`);
    };

    // Client-side Sorting & Pagination Logic for Bulk Mode
    let visibleProducts = products;
    let currentLimit = parseInt(searchParams.get('limit') || initialLimit.toString(), 10);
    // In bulk mode, we use client-side pagination 'bulkPage'
    // In normal mode, we use server-side 'currentPage' prop
    let currentPageNum = isBulkMode ? bulkPage : currentPage;
    let currentTotal = isBulkMode ? products.length : totalCount;

    if (isBulkMode) {
        // 1. Sort
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

        // 2. Paginate
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
                        스마트스토어 미등록 상품 <span className="font-bold">{smartstoreStats.unregistered.toLocaleString()}</span>
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
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">출력:</span>
                    <select
                        className="h-8 text-xs border rounded px-2 bg-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        value={currentLimit}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('limit', e.target.value);
                            params.set('page', '1'); // Reset to page 1
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
