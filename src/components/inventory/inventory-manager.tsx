'use client';

import { useState, useEffect } from 'react';
import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface InventoryManagerProps {
    initialProducts: any[];
    initialTotalCount: number;
    initialLimit: number;
    currentPage: number;
    categories: any[];
}

export function InventoryManager({
    initialProducts,
    initialTotalCount,
    initialLimit,
    currentPage,
    categories
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

    const handleReset = () => {
        setIsBulkMode(false);
        setProducts(initialProducts);
        setTotalCount(initialTotalCount);
        setSortConfig(null);
        setBulkPage(1);

        // If we are on a filtered URL, maybe we should reset that too?
        // But 'Reset' usually means reset the bulk search mode back to normal view.
        // It currently keeps URL state which is fine.
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
            <InventoryFilter
                brands={[]}
                categories={categories}
                onBulkSearch={handleBulkSearch}
                onReset={handleReset}
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
