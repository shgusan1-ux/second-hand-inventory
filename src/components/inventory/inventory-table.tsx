'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SmartStoreButton } from '@/components/inventory/smartstore-button';
import { DiscardButton } from '@/components/inventory/discard-button';
import { Button } from '@/components/ui/button';
import { Edit, ChevronLeft, ChevronRight, CheckSquare, Square, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getInventoryForExport, bulkDeleteProducts } from '@/lib/actions';
import { toast } from 'sonner';
import { ProductEditDialog } from '@/components/inventory/product-edit-dialog';
import { BulkEditDialog } from '@/components/inventory/bulk-edit-dialog';
import * as XLSX from 'xlsx';

export function InventoryTable({ products, totalCount, limit, currentPage, isEditable = false, categories = [] }: { products: any[], totalCount: number, limit: number, currentPage: number, isEditable?: boolean, categories?: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const totalPages = Math.ceil(totalCount / limit);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleAll = () => {
        if (selectedIds.length === products.length) setSelectedIds([]);
        else setSelectedIds(products.map(p => p.id));
    };

    const toggleOne = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(s => s !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const handlePageChange = (p: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', p.toString());
        router.push(`/inventory?${params.toString()}`);
    };

    const handleEditImage = () => {
        alert(`이미지 수정 기능 (선택된 ${selectedIds.length}개) - API 연동 예정\n\n현재 선택된 ID:\n${selectedIds.join(', ')}`);
        // Here we would open a modal or call an API
    };

    const handleDownloadExcel = async (type: 'all' | 'selected') => {
        let dataToExport: any[] = [];
        const fileName = `inventory_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        if (type === 'selected') {
            if (selectedIds.length === 0) {
                toast.error('선택된 상품이 없습니다.');
                return;
            }
            // Filter locally from displayed products (assumption: selection is only on current page for now, or we track full objects)
            // If we tracked only IDs, we can only export visible items. 
            // For better UX, we should export visible selected items.
            dataToExport = products.filter(p => selectedIds.includes(p.id));
        } else {
            // Download All (Filtered)
            const params = Object.fromEntries(searchParams.entries());
            dataToExport = await getInventoryForExport(params);
        }

        if (dataToExport.length === 0) {
            toast.error('다운로드할 데이터가 없습니다.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, fileName);
        toast.success(`${dataToExport.length}개 상품 다운로드 완료`);
    };

    // Pagination Range Logic
    const getPageNumbers = () => {
        const pages = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }

        for (let i = start; i <= end; i++) pages.push(i);

        if (end < totalPages) {
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    };

    const getSortLink = (col: string) => {
        const currentSort = searchParams.get('sort');
        const currentOrder = searchParams.get('order') || 'desc';
        let newOrder = 'desc';
        if (currentSort === col && currentOrder === 'desc') newOrder = 'asc';

        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', col);
        params.set('order', newOrder);

        return `/inventory?${params.toString()}`;
    };

    const SortIcon = ({ col }: { col: string }) => {
        const sort = searchParams.get('sort');
        const order = searchParams.get('order');
        if (sort !== col) return <span className="text-slate-300 ml-1">↕</span>;
        return <span className="text-emerald-500 ml-1">{order === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleBulkDelete = async () => {
        if (!confirm(`${selectedIds.length}개의 상품을 정말로 삭제(폐기)하시겠습니까?`)) return;

        const result = await bulkDeleteProducts(selectedIds);
        if (result.success) {
            toast.success(`${selectedIds.length}개 상품이 폐기되었습니다.`);
            setSelectedIds([]);
            router.refresh();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Bulk Actions Bar */}
            <div className={`transition-all duration-300 overflow-hidden ${selectedIds.length > 0 ? 'h-12 opacity-100' : 'h-0 opacity-0'}`}>
                <div className="bg-slate-900 text-white p-2 rounded-md flex items-center justify-between px-4 shadow-lg">
                    <span className="text-sm font-bold flex items-center">
                        <CheckSquare className="w-4 h-4 mr-2 text-emerald-400" />
                        {selectedIds.length}개 상품 선택됨
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-8 text-xs font-semibold hover:bg-red-600 transition-colors">
                            선택 삭제
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setBulkEditOpen(true)} className="h-8 text-xs font-semibold hover:bg-emerald-500 hover:text-white transition-colors">
                            <Edit className="w-3 h-3 mr-2" />
                            일괄 수정
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDownloadExcel('selected')} className="h-8 text-xs font-semibold hover:bg-blue-500 hover:text-white transition-colors">
                            <Download className="w-3 h-3 mr-2" />
                            선택 엑셀
                        </Button>
                    </div>
                </div>
            </div>

            <BulkEditDialog
                open={bulkEditOpen}
                onClose={() => setBulkEditOpen(false)}
                selectedIds={selectedIds}
                categories={categories}
            />

            {/* Actions Bar (Download All) */}
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadExcel('all')} className="h-8 text-xs">
                    <Download className="w-3 h-3 mr-2" />
                    전체 필터결과 엑셀 다운로드
                </Button>
            </div>

            {/* Table */}
            <div className="relative w-full overflow-auto border rounded-md bg-white shadow-sm">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b bg-slate-50 sticky top-0 z-10">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle w-[50px]">
                                <input type="checkbox"
                                    checked={products.length > 0 && selectedIds.length === products.length}
                                    onChange={toggleAll}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                />
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[80px]">이미지</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                <Link href={getSortLink('id')} className="flex items-center hover:text-slate-900">
                                    자체상품코드 <SortIcon col="id" />
                                </Link>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                <Link href={getSortLink('name')} className="flex items-center hover:text-slate-900">
                                    상품명 <SortIcon col="name" />
                                </Link>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">브랜드</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">사이즈</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">카테고리</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                <Link href={getSortLink('price_sell')} className="flex items-center hover:text-slate-900">
                                    판매가 <SortIcon col="price_sell" />
                                </Link>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                <Link href={getSortLink('status')} className="flex items-center hover:text-slate-900">
                                    상태 <SortIcon col="status" />
                                </Link>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                                {isEditable ? '관리' : '스마트스토어'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0 divide-y">
                        {products.length === 0 ? (
                            <tr><td colSpan={10} className="p-10 text-center text-slate-500">검색 조건에 맞는 상품이 없습니다.</td></tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.id} className={`transition-colors hover:bg-slate-50 ${selectedIds.includes(product.id) ? 'bg-emerald-50/50' : ''}`}>
                                    <td className="p-3 align-middle px-4">
                                        <input type="checkbox"
                                            checked={selectedIds.includes(product.id)}
                                            onChange={() => toggleOne(product.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                        />
                                    </td>
                                    <td className="p-3 align-middle">
                                        <div
                                            className="relative h-12 w-12 rounded overflow-hidden bg-slate-100 border group cursor-pointer"
                                            onClick={(e) => {
                                                // Toggle logic for mobile/desktop
                                                const target = e.currentTarget;
                                                if (target.classList.contains('fixed')) {
                                                    target.classList.remove('fixed', 'z-50', 'w-[80vw]', 'h-[80vw]', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'shadow-2xl');
                                                    target.classList.add('h-12', 'w-12', 'relative');
                                                } else {
                                                    target.classList.remove('h-12', 'w-12', 'relative');
                                                    target.classList.add('fixed', 'z-50', 'w-[80vw]', 'h-[80vw]', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'shadow-2xl');
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                // Hover zoom effect (scale)
                                                e.currentTarget.classList.add('scale-150', 'z-20');
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!e.currentTarget.classList.contains('fixed')) {
                                                    e.currentTarget.classList.remove('scale-150', 'z-20');
                                                }
                                            }}
                                        >
                                            {product.image_url ? (
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover transition-all duration-300"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[10px] text-slate-400">No Image</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 align-middle">
                                        <span className="font-mono text-emerald-700 font-medium">
                                            {product.id}
                                        </span>
                                    </td>
                                    <td className="p-3 align-middle font-medium max-w-[200px] truncate" title={product.name}>
                                        {isEditable ? (
                                            <button onClick={() => setEditingProduct(product)} className="hover:underline text-left">
                                                {product.name}
                                            </button>
                                        ) : (
                                            product.name
                                        )}
                                    </td>
                                    <td className="p-3 align-middle text-slate-600">{product.brand}</td>
                                    <td className="p-3 align-middle text-slate-500 text-xs">{product.size}</td>
                                    <td className="p-3 align-middle text-slate-500 hidden md:table-cell text-xs">{product.category}</td>
                                    <td className="p-3 align-middle font-semibold text-slate-700">₩{product.price_sell.toLocaleString()}</td>
                                    <td className="p-3 align-middle text-center">
                                        <span className={
                                            product.status === '판매중' ? 'bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-emerald-200' :
                                                product.status === '판매완료' ? 'bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs font-semibold border border-slate-200' :
                                                    product.status === '판매대기' ? 'bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-yellow-200' :
                                                        product.status === '수정중' ? 'bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-200' :
                                                            'bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-orange-200'
                                        }>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="p-3 align-middle text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* SmartStoreButton removed */}
                                            {isEditable && (
                                                <>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="수정">
                                                        <Edit className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                    <DiscardButton id={product.id} name={product.name} />
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Dialog */}
            {isEditable && (
                <ProductEditDialog
                    open={!!editingProduct}
                    onClose={() => setEditingProduct(null)}
                    product={editingProduct}
                    categories={categories}
                />
            )}

            {/* Pagination Logic ... */}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pb-10">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {getPageNumbers().map((p, i) => (
                        <Button
                            key={i}
                            variant={p === currentPage ? "default" : "outline"}
                            size="sm"
                            className={`h-8 w-8 p-0 ${p === currentPage ? "bg-slate-900 hover:bg-slate-800" : "hover:bg-slate-100"} ${p === '...' ? 'cursor-default hover:bg-white border-none' : ''}`}
                            onClick={() => typeof p === 'number' && handlePageChange(p)}
                            disabled={p === '...'}
                        >
                            {p}
                        </Button>
                    ))}

                    <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <span className="text-xs text-slate-500 ml-4">
                        Total {totalCount} items
                    </span>
                </div>
            )}
        </div>
    );
}
