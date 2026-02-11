'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

interface Product {
  originProductNo: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  images?: any;
  lifecycle?: { stage: string; daysSince: number };
}

interface InventoryManagementTabProps {
  products: Product[];
  onRefresh: () => void;
  parentFilter?: string | null;
}

export function InventoryManagementTab({ products, parentFilter }: InventoryManagementTabProps) {
  const [filter, setFilter] = useState<'ALL' | 'SELLING' | 'OUTOFSTOCK'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sync internal filter with parent filter
  useMemo(() => {
    if (parentFilter === 'sale') setFilter('SELLING');
    else if (parentFilter === 'outofstock') setFilter('OUTOFSTOCK');
    else if (parentFilter) setFilter('ALL');
  }, [parentFilter]);

  // 팔림/안팔림 기준: stockQuantity === 0 또는 statusType !== 'SALE' → 팔림
  const stats = useMemo(() => {
    const selling = products.filter(p => p.stockQuantity > 0 && p.statusType === 'SALE').length;
    const outOfStock = products.filter(p => p.stockQuantity === 0 || p.statusType === 'OUTOFSTOCK').length;
    return { total: products.length, selling, outOfStock };
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.originProductNo.includes(searchTerm)
      );
    }

    if (filter === 'SELLING') {
      list = list.filter(p => p.stockQuantity > 0 && p.statusType === 'SALE');
    } else if (filter === 'OUTOFSTOCK') {
      list = list.filter(p => p.stockQuantity === 0 || p.statusType === 'OUTOFSTOCK');
    }

    return list;
  }, [products, filter, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleFilterChange = (newFilter: 'ALL' | 'SELLING' | 'OUTOFSTOCK') => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const sellingPercent = stats.total > 0 ? Math.round((stats.selling / stats.total) * 100) : 0;
  const soldPercent = stats.total > 0 ? Math.round((stats.outOfStock / stats.total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* 판매 현황 요약 */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">판매 현황</span>
          <span className="text-xs text-slate-400">{stats.total}개 전체</span>
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${sellingPercent}%` }}
          />
          <div
            className="bg-red-400 h-full transition-all duration-500"
            style={{ width: `${soldPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">판매중 <strong className="text-emerald-600">{stats.selling}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-xs text-slate-600">품절 <strong className="text-red-500">{stats.outOfStock}</strong></span>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="grid grid-cols-3 gap-1.5">
        {([
          { key: 'ALL' as const, label: '전체', count: stats.total },
          { key: 'SELLING' as const, label: '판매중', count: stats.selling },
          { key: 'OUTOFSTOCK' as const, label: '품절', count: stats.outOfStock },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 border ${filter === f.key
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {f.label}
            <span className={`ml-1 opacity-70 ${filter === f.key ? 'text-blue-300' : 'text-slate-400'}`}>
              ({f.count})
            </span>
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="상품명 또는 상품번호 검색..."
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* 결과 수 및 페이지 사이즈 선택 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-500">{filtered.length.toLocaleString()}개 상품</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">보기</span>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {[50, 100, 300, 500].map(size => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${pageSize === size ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 상품 리스트 */}
      <div className="space-y-2">
        {paginatedItems.map(p => {
          const isSold = p.stockQuantity === 0 || p.statusType === 'OUTOFSTOCK';
          const isSuspended = p.statusType === 'SUSPENSION';

          return (
            <div key={p.originProductNo} className={`bg-white rounded-xl border p-3 transition-all hover:shadow-sm ${isSold || isSuspended ? 'bg-slate-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                {/* 상태 표시 아이콘 */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${isSold ? 'bg-red-50 border-red-100 text-red-500' :
                    isSuspended ? 'bg-orange-50 border-orange-100 text-orange-500' :
                      'bg-emerald-50 border-emerald-100 text-emerald-500'
                  }`}>
                  {isSold ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : isSuspended ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>

                {/* 상품 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{p.originProductNo}</span>
                    {isSuspended && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">판매중지</span>}
                  </div>
                  <p className="font-bold text-sm text-slate-800 truncate leading-snug">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] font-black text-blue-600">{p.salePrice?.toLocaleString()}원</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className={`text-[11px] font-bold ${isSold ? 'text-red-500' : 'text-slate-500'}`}>
                      재고 {p.stockQuantity}개
                    </span>
                  </div>
                </div>

                {/* 우측 액션/상태 */}
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${isSold ? 'bg-red-500 text-white' :
                      isSuspended ? 'bg-orange-500 text-white' :
                        'bg-slate-900 text-white'
                    }`}>
                    {isSold ? 'OUT OF STOCK' : isSuspended ? 'SUSPENDED' : 'IN STOCK'}
                  </span>
                  {p.lifecycle && (
                    <span className="text-[9px] font-bold text-slate-400">
                      {p.lifecycle.stage} · {p.lifecycle.daysSince}일차
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 페이지네이션 하단 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">
            {searchTerm ? '검색 결과가 없습니다.' : '표시할 상품이 없습니다.'}
          </p>
        </div>
      )}

      {filtered.length > 100 && (
        <div className="text-center py-3 text-xs text-slate-400">
          {filtered.length}개 중 100개 표시
        </div>
      )}
    </div>
  );
}
