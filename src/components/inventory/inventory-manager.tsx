'use client';

import { useState, useEffect } from 'react';
import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { useRouter, useSearchParams } from 'next/navigation';

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
            setIsBulkMode(false);
            setProducts(initialProducts);
            setTotalCount(initialTotalCount);
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
        } catch (error) {
            console.error('Bulk search error:', error);
            alert('대량 검색 중 오류가 발생했습니다.');
            setIsBulkMode(false); // Revert on error
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
        router.push('/inventory/manage');
    };



    // Client-side Sorting & Pagination Logic for Bulk Mode
    let visibleProducts = products;
    let currentTotal = totalCount;
    let currentLimit = parseInt(searchParams.get('limit') || initialLimit.toString(), 10);
    let currentPageNum = currentPage;

    if (isBulkMode) {
        // 1. Sort
        if (sortConfig) {
            visibleProducts = [...products].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                // Handle null/undefined
                if (!aValue && !bValue) return 0;
                if (!aValue) return 1;
                if (!bValue) return -1;

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 2. Paginate
        // Use the current limit setting (or default 50). 
        // Note: Changing limit via Select triggers reload, which resets bulk mode.
        // User should set limit BEFORE bulk search for best experience, 
        // OR we need to intercept limit change too (but that's complex).
        // For now, allow pagination within the current limit.
        currentTotal = products.length;
        currentPageNum = bulkPage;

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
                    검색 결과: <span className="font-bold text-slate-900">{totalCount.toLocaleString()}</span>개
                    {isBulkMode && <span className="ml-2 text-xs text-emerald-600 font-medium">(대량 검색 모드)</span>}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">출력:</span>
                    <select
                        className="h-8 text-xs border rounded px-2 bg-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        value={searchParams.get('limit') || initialLimit.toString()}
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
                totalCount={isBulkMode ? currentTotal : totalCount}
                limit={currentLimit}
                currentPage={currentPageNum}
                isEditable={true}
                categories={categories}
                onSort={handleSort}
                onPageChange={handlePageChange}
                isBulkMode={isBulkMode}
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
