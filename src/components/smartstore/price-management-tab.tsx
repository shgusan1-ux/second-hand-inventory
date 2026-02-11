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
              <span className={`text-[10px] font-bold ${
                stage === 'NEW' ? 'text-emerald-600' :
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
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs shrink-0"
        >
          <option value="ALL">전체</option>
          <option value="NEW">NEW</option>
          <option value="CURATED">CURATED</option>
          <option value="ARCHIVE">ARCHIVE</option>
          <option value="CLEARANCE">CLEARANCE</option>
        </select>
      </div>

      {/* 가격 카드 리스트 */}
      <div className="space-y-2">
        {filtered.slice(0, 100).map(p => {
          const stage = p.lifecycle?.stage || 'NEW';
          const discount = DEFAULT_DISCOUNT_RULES[stage] || 0;
          const suggestedPrice = Math.round(p.salePrice * (1 - discount / 100));
          return (
            <div key={p.originProductNo} className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.lifecycle && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      stage === 'NEW' ? 'bg-emerald-100 text-emerald-700' :
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
    </div>
  );
}
