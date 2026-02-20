'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SmartStoreButton } from '@/components/inventory/smartstore-button';
import { DiscardButton } from '@/components/inventory/discard-button';
import { Button } from '@/components/ui/button';
import { Edit, ChevronLeft, ChevronRight, CheckSquare, Square, Download, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getInventoryForExport, bulkDeleteProducts } from '@/lib/actions';
import { toast } from 'sonner';
import { ProductEditDialog } from '@/components/inventory/product-edit-dialog';
import { BulkEditDialog } from '@/components/inventory/bulk-edit-dialog';
import * as XLSX from 'xlsx';
import { BulkAiUpdateDialog } from '@/components/inventory/bulk-ai-update-dialog';
import { ProductDetailPreview } from '@/components/inventory/product-detail-preview';
import { BulkUpdateExcelDialog } from '@/components/inventory/bulk-update-excel-dialog';

interface InventoryTableProps {
    products: any[];
    totalCount: number;
    limit: number;
    currentPage: number;
    isEditable?: boolean;
    categories?: any[];
    onSort?: (key: string) => void;
    onPageChange?: (page: number) => void;
    isBulkMode?: boolean;
    onExportAll?: () => void;
}

export function InventoryTable({
    products,
    totalCount,
    limit,
    currentPage,
    isEditable = false,
    categories = [],
    onSort,
    onPageChange,
    isBulkMode = false,
    onExportAll
}: InventoryTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [previewProduct, setPreviewProduct] = useState<any>(null);
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
        if (isBulkMode && onPageChange) {
            onPageChange(p);
        } else {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', p.toString());
            // Use current pathname to support both /inventory and /inventory/manage
            router.push(`${window.location.pathname}?${params.toString()}`);
        }
    };

    const handleEditImage = () => {
        alert(`이미지 수정 기능 (선택된 ${selectedIds.length}개) - API 연동 예정\n\n현재 선택된 ID:\n${selectedIds.join(', ')}`);
        // Here we would open a modal or call an API
    };

    const handleDownloadExcel = async (type: 'all' | 'selected') => {
        let dataToExport: any[] = [];
        const fileName = `inventory_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        if (type === 'all') {
            if (isBulkMode && onExportAll) {
                onExportAll();
                return;
            }

            // Download All (Filtered)
            const params = Object.fromEntries(searchParams.entries());
            dataToExport = await getInventoryForExport(params);
        } else {
            if (selectedIds.length === 0) {
                toast.error('선택된 상품이 없습니다.');
                return;
            }
            // Filter locally from displayed products (assumption: selection is only on current page for now, or we track full objects)
            // If we tracked only IDs, we can only export visible items. 
            // For better UX, we should export visible selected items.
            dataToExport = products.filter(p => selectedIds.includes(p.id));
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

    const handleHeaderClick = (col: string) => {
        if (isBulkMode && onSort) {
            onSort(col);
        } else {
            router.push(getSortLink(col));
        }
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
                        {isEditable && (
                            <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="h-8 text-xs font-semibold hover:bg-red-600 transition-colors">
                                선택 삭제
                            </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => {
                            if (selectedIds.length > 50) {
                                toast.error('상품 에디터는 최대 50개까지 선택할 수 있습니다.');
                                return;
                            }
                            const selectedProducts = products.filter((p: any) => selectedIds.includes(p.id));
                            sessionStorage.setItem('product-editor-data', JSON.stringify(selectedProducts));
                            if (categories.length > 0) {
                                sessionStorage.setItem('product-editor-categories', JSON.stringify(categories));
                            }
                            window.open('/inventory/product-editor', '_blank');
                        }} className="h-8 text-xs font-semibold hover:bg-violet-500 hover:text-white transition-colors">
                            <Edit className="w-3 h-3 mr-2" />
                            상품 에디터
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

            {/* Actions Bar & Top Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-2 rounded-md border">
                <div className="text-xs text-slate-500 font-medium pl-2">
                    총 <span className="text-slate-900 font-bold">{totalCount.toLocaleString()}</span>개 중
                    <span className="ml-1 text-slate-700">{(currentPage - 1) * limit + 1} ~ {Math.min(currentPage * limit, totalCount)}</span> 표시
                </div>

                <div className="flex items-center gap-3">
                    {/* Top Pagination Controls */}
                    <div className="flex items-center gap-1 bg-white rounded border px-2 py-1 shadow-sm">
                        <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} className="h-6 w-6 p-0 hover:bg-slate-100">
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-medium min-w-[30px] text-center">
                            {currentPage} / {totalPages || 1}
                        </span>
                        <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)} className="h-6 w-6 p-0 hover:bg-slate-100">
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => handleDownloadExcel('all')} className="h-8 text-xs bg-white hover:bg-slate-50">
                        <Download className="w-3 h-3 mr-2 text-slate-500" />
                        전체 엑셀 (다운로드)
                    </Button>
                    <BulkUpdateExcelDialog />
                </div>
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
                            <th className="h-12 px-4 align-middle w-[60px]">이미지</th>
                            <th className="h-12 px-2 md:px-4 align-middle font-medium text-muted-foreground cursor-pointer hidden md:table-cell" onClick={() => handleHeaderClick('id')}>
                                <div className="flex items-center hover:text-slate-900">
                                    자체상품코드 <SortIcon col="id" />
                                </div>
                            </th>
                            <th className="h-12 px-2 md:px-4 align-middle font-medium text-muted-foreground cursor-pointer" onClick={() => handleHeaderClick('name')}>
                                <div className="flex items-center hover:text-slate-900">
                                    상품명 <SortIcon col="name" />
                                </div>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden lg:table-cell">브랜드</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden sm:table-cell">등급</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden sm:table-cell">사이즈</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden md:table-cell">카테고리</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden lg:table-cell">마스터등록일</th>

                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer" onClick={() => handleHeaderClick('price_sell')}>
                                <div className="flex items-center hover:text-slate-900">
                                    판매가 <SortIcon col="price_sell" />
                                </div>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer" onClick={() => handleHeaderClick('status')}>
                                <div className="flex items-center hover:text-slate-900">
                                    상태 <SortIcon col="status" />
                                </div>
                            </th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">스토어</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                                {isEditable ? '관리' : '스마트스토어'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0 divide-y">
                        {products.length === 0 ? (
                            <tr><td colSpan={13} className="p-10 text-center text-slate-500">검색 조건에 맞는 상품이 없습니다.</td></tr>
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
                                    <td className="p-3 align-middle hidden md:table-cell">
                                        <span className="font-mono text-emerald-700 font-medium">
                                            {product.id}
                                        </span>
                                    </td>
                                    <td className="p-2 md:p-3 align-middle font-medium max-w-[150px] md:max-w-[200px]" title={product.name}>
                                        <div className="flex items-center gap-2">
                                            <span className="truncate">
                                                <button onClick={() => {
                                                    sessionStorage.setItem('product-editor-data', JSON.stringify([product]));
                                                    if (categories.length > 0) {
                                                        sessionStorage.setItem('product-editor-categories', JSON.stringify(categories));
                                                    }
                                                    window.open('/inventory/product-editor', '_blank');
                                                }} className="hover:underline text-left text-violet-700 hover:text-violet-900 font-medium cursor-pointer">
                                                    {product.name}
                                                </button>
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 shrink-0"
                                                onClick={() => setPreviewProduct(product)}
                                                title="상세페이지 미리보기"
                                            >
                                                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                            </Button>
                                        </div>
                                    </td>
                                    <td className="p-3 align-middle text-slate-600 hidden lg:table-cell">{product.brand}</td>
                                    <td className="p-3 align-middle text-center hidden sm:table-cell">
                                        <span className={
                                            product.condition === 'S급' ? 'bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-purple-200' :
                                                product.condition === 'A급' ? 'bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-200' :
                                                    'bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold border border-slate-200'
                                        }>
                                            {product.condition || 'A급'}
                                        </span>
                                    </td>
                                    <td className="p-3 align-middle text-slate-500 text-xs hidden sm:table-cell">{product.size}</td>
                                    <td className="p-3 align-middle hidden md:table-cell">
                                        {(() => {
                                            // 1. Use joined data from DB (Preferred)
                                            if (product.category_classification && product.category_name) {
                                                const classification = product.category_classification;
                                                const displayName = product.category_name;

                                                let badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200';
                                                if (classification === 'MAN') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-100';
                                                else if (classification === 'WOMAN') badgeStyle = 'bg-pink-50 text-pink-700 border-pink-100';
                                                else if (classification === 'KIDS') badgeStyle = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                                                else if (classification === '악세사리') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-100';

                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border min-w-[2.5rem] text-center shrink-0 ${badgeStyle}`}>
                                                            {classification}
                                                        </span>
                                                        <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]" title={displayName}>
                                                            {displayName}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            // 2. Fallback: Find matching category locally
                                            const categoryValue = product.category || '';
                                            const matchedCategory = categories.find(c =>
                                                c.id === categoryValue ||
                                                c.name === categoryValue ||
                                                c.id === categoryValue.toUpperCase()
                                            );

                                            const classification = matchedCategory?.classification || '기타';
                                            const displayName = matchedCategory?.name || categoryValue || '-';

                                            // Style based on classification
                                            let badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200';
                                            if (classification === 'MAN') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-100';
                                            else if (classification === 'WOMAN') badgeStyle = 'bg-pink-50 text-pink-700 border-pink-100';
                                            else if (classification === 'KIDS') badgeStyle = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                                            else if (classification === '악세사리') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-100';

                                            return (
                                                <div className="flex items-center gap-2">
                                                    {categoryValue !== '' && classification !== '기타' && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border min-w-[2.5rem] text-center shrink-0 ${badgeStyle}`}>
                                                            {classification}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]" title={displayName}>
                                                        {displayName}
                                                        {classification === '기타' && categoryValue && ` (${categoryValue})`}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-3 align-middle text-slate-500 text-xs hidden lg:table-cell">
                                        {product.master_reg_date ? new Date(product.master_reg_date).toLocaleDateString('ko-KR') : '-'}
                                    </td>
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
                                    <td className="p-3 align-middle text-center">
                                        {product.smartstore_no ? (
                                            <a
                                                href={`https://smartstore.naver.com/brownstreet/products/${product.smartstore_no}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`스마트스토어 #${product.smartstore_no}`}
                                            >
                                                <Badge variant="outline" className={`text-[10px] cursor-pointer ${
                                                    product.smartstore_status === 'SALE' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                                    product.smartstore_status === 'OUTOFSTOCK' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                                    'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                }`}>
                                                    {product.smartstore_status === 'SALE' ? '판매중' :
                                                     product.smartstore_status === 'OUTOFSTOCK' ? '품절' :
                                                     product.smartstore_status === 'SUSPENSION' ? '중지' : '대기'}
                                                </Badge>
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-slate-400">미등록</span>
                                        )}
                                    </td>
                                    <td className="p-3 align-middle text-right">
                                        <div className="flex justify-end gap-2">
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

            {/* Detail Preview Dialog */}
            <ProductDetailPreview
                open={!!previewProduct}
                onClose={() => setPreviewProduct(null)}
                product={previewProduct}
            />

            {/* Edit Dialog */}
            {
                isEditable && (
                    <ProductEditDialog
                        open={!!editingProduct}
                        onClose={() => setEditingProduct(null)}
                        product={editingProduct}
                        categories={categories}
                    />
                )
            }

            {/* Pagination Logic ... */}

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
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
                )
            }
        </div >
    );
}
