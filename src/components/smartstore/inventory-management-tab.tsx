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

interface InventoryManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

export function InventoryManagementTab({ products, onRefresh }: InventoryManagementTabProps) {
  const [sortBy, setSortBy] = useState<'stock-asc' | 'stock-desc' | 'name'>('stock-asc');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
    const outOfStock = products.filter(p => p.stockQuantity === 0).length;
    const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 3).length;
    const selling = products.filter(p => p.statusType === 'SALE').length;
    return { totalStock, outOfStock, lowStock, selling };
  }, [products]);

  const sortedProducts = useMemo(() => {
    let list = [...products];
    if (searchTerm) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.originProductNo.includes(searchTerm)
      );
    }
    switch (sortBy) {
      case 'stock-asc': return list.sort((a, b) => a.stockQuantity - b.stockQuantity);
      case 'stock-desc': return list.sort((a, b) => b.stockQuantity - a.stockQuantity);
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  }, [products, sortBy, searchTerm]);

  return (
    <div className="space-y-3">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl border p-3">
          <p className="text-[10px] text-slate-500">총 재고</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalStock.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <p className="text-[10px] text-slate-500">판매중</p>
          <p className="text-xl font-bold text-emerald-600">{stats.selling}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 border-red-100">
          <p className="text-[10px] text-red-400">품절</p>
          <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 border-amber-100">
          <p className="text-[10px] text-amber-500">재고 부족 (3이하)</p>
          <p className="text-xl font-bold text-amber-600">{stats.lowStock}</p>
        </div>
      </div>

      {/* 재고 부족 알림 */}
      {stats.lowStock > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <h3 className="font-bold text-sm text-amber-800 mb-2">재고 부족 알림</h3>
          <div className="space-y-1.5">
            {products
              .filter(p => p.stockQuantity > 0 && p.stockQuantity <= 3)
              .slice(0, 10)
              .map(p => (
                <div key={p.originProductNo} className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 truncate max-w-[70%] text-xs">{p.name}</span>
                  <span className="font-bold text-amber-800 text-xs shrink-0 ml-2">재고 {p.stockQuantity}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 검색 + 정렬 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="상품 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs shrink-0"
        >
          <option value="stock-asc">재고 적은순</option>
          <option value="stock-desc">재고 많은순</option>
          <option value="name">이름순</option>
        </select>
      </div>

      {/* 재고 카드 리스트 */}
      <div className="space-y-2">
        {sortedProducts.slice(0, 100).map(p => (
          <div key={p.originProductNo} className="bg-white rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    p.statusType === 'SALE' ? 'bg-emerald-100 text-emerald-700' :
                    p.statusType === 'OUTOFSTOCK' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {p.statusType === 'SALE' ? '판매중' : p.statusType === 'OUTOFSTOCK' ? '품절' : p.statusType}
                  </span>
                  {p.lifecycle && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      p.lifecycle.stage === 'NEW' ? 'bg-emerald-100 text-emerald-700' :
                      p.lifecycle.stage === 'CURATED' ? 'bg-indigo-100 text-indigo-700' :
                      p.lifecycle.stage === 'ARCHIVE' ? 'bg-slate-200 text-slate-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {p.lifecycle.stage}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{p.salePrice?.toLocaleString()}원</span>
                </div>
              </div>
              <div className="shrink-0 ml-3 text-center">
                <span className={`text-2xl font-bold block ${
                  p.stockQuantity === 0 ? 'text-red-500' :
                  p.stockQuantity <= 3 ? 'text-amber-500' : 'text-slate-700'
                }`}>
                  {p.stockQuantity}
                </span>
                <span className="text-[10px] text-slate-400">재고</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedProducts.length > 100 && (
        <div className="text-center py-3 text-xs text-slate-400">
          {sortedProducts.length}개 중 100개 표시
        </div>
      )}
    </div>
  );
}
