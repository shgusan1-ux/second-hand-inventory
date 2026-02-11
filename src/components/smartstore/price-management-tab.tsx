'use client';

import { useState, useMemo } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  lifecycle?: { stage: string; daysSince: number };
}

interface PriceManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

const DEFAULT_DISCOUNT_RULES: Record<string, number> = {
  NEW: 0,
  CURATED: 0,
  ARCHIVE: 10,
  CLEARANCE: 20,
};

export function PriceManagementTab({ products, onRefresh }: PriceManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const priceStats = useMemo(() => {
    const selling = products.filter(p => p.statusType === 'SALE');
    const avgPrice = selling.length > 0
      ? Math.round(selling.reduce((sum, p) => sum + p.salePrice, 0) / selling.length)
      : 0;
    const maxPrice = selling.length > 0 ? Math.max(...selling.map(p => p.salePrice)) : 0;
    const minPrice = selling.length > 0 ? Math.min(...selling.map(p => p.salePrice)) : 0;
    const totalValue = selling.reduce((sum, p) => sum + (p.salePrice * p.stockQuantity), 0);
    return { avgPrice, maxPrice, minPrice, totalValue };
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (searchTerm) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.originProductNo.includes(searchTerm)
      );
    }
    if (stageFilter !== 'ALL') {
      list = list.filter(p => p.lifecycle?.stage === stageFilter);
    }
    return list.sort((a, b) => b.salePrice - a.salePrice);
  }, [products, searchTerm, stageFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleStageFilterChange = (val: string) => {
    setStageFilter(val);
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

  return (
    <div className="space-y-3">
      {/* 가격 통계 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl border p-3">
          <p className="text-[10px] text-slate-500">평균가</p>
          <p className="text-lg font-bold text-slate-800">{priceStats.avgPrice.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-[10px] text-slate-500">재고 가치</p>
          <p className="text-lg font-bold text-indigo-600">{(priceStats.totalValue / 10000).toFixed(0)}만원</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-[10px] text-slate-500">최고가</p>
          <p className="text-lg font-bold text-emerald-600">{priceStats.maxPrice.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-[10px] text-slate-500">최저가</p>
          <p className="text-lg font-bold text-blue-600">{priceStats.minPrice.toLocaleString()}원</p>
        </div>
      </div>

      {/* 할인 규칙 */}
      <div className="bg-white rounded-xl border p-3">
        <h3 className="font-bold text-sm text-slate-800 mb-2">기본 할인 규칙</h3>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(DEFAULT_DISCOUNT_RULES).map(([stage, pct]) => (
            <div key={stage} className="text-center p-2 bg-slate-50 rounded-lg">
              <span className={`text-[10px] font-bold ${stage === 'NEW' ? 'text-emerald-600' :
                  stage === 'CURATED' ? 'text-indigo-600' :
                    stage === 'ARCHIVE' ? 'text-slate-600' :
                      'text-amber-600'
                }`}>{stage}</span>
              <p className="text-sm font-bold text-slate-800">-{pct}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="상품 검색..."
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={stageFilter}
          onChange={e => handleStageFilterChange(e.target.value)}
          className="px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs shrink-0"
        >
          <option value="ALL">전체</option>
          <option value="NEW">NEW</option>
          <option value="CURATED">CURATED</option>
          <option value="ARCHIVE">ARCHIVE</option>
          <option value="CLEARANCE">CLEARANCE</option>
        </select>
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

      {/* 가격 카드 리스트 */}
      <div className="space-y-2">
        {paginatedItems.map(p => {
          const stage = p.lifecycle?.stage || 'NEW';
          const discount = DEFAULT_DISCOUNT_RULES[stage] || 0;
          const suggestedPrice = Math.round(p.salePrice * (1 - discount / 100));
          return (
            <div key={p.originProductNo} className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.lifecycle && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${stage === 'NEW' ? 'bg-emerald-100 text-emerald-700' :
                        stage === 'CURATED' ? 'bg-indigo-100 text-indigo-700' :
                          stage === 'ARCHIVE' ? 'bg-slate-200 text-slate-700' :
                            'bg-amber-100 text-amber-700'
                      }`}>
                      {stage}
                    </span>
                  )}
                  <span className="text-sm font-bold text-slate-700">{p.salePrice.toLocaleString()}원</span>
                </div>
                {discount > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-xs text-red-500 font-bold">-{discount}%</span>
                    <p className="text-sm font-bold text-red-600">{suggestedPrice.toLocaleString()}원</p>
                  </div>
                )}
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
    </div>
  );
}
