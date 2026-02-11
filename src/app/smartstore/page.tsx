'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface Product {
  originProductNo: string;
  channelProductNo: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  regDate: string;
  statusType: string;
  sellerManagementCode?: string;
  lifecycle?: {
    stage: string;
    daysSince: number;
  };
}

export default function SmartstorePage() {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const res = await fetch('/api/smartstore/products?fetchAll=true');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const allProducts: Product[] = data?.data?.contents || [];
  const totalCount = data?.data?.totalCount || 0;
  const isCached = data?.data?.cached || false;

  // Client-side filtering by stage
  const filteredProducts = filter === 'all'
    ? allProducts
    : allProducts.filter(p => p.lifecycle?.stage === filter);

  // Client-side search filtering
  const displayProducts = searchTerm
    ? filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.originProductNo.includes(searchTerm) ||
        (p.sellerManagementCode || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredProducts;

  const handleRefresh = async () => {
    queryClient.removeQueries({ queryKey: ['all-products'] });
    const res = await fetch('/api/smartstore/products?fetchAll=true&refresh=true');
    const freshData = await res.json();
    queryClient.setQueryData(['all-products'], freshData);
  };

  // Count by stage
  const stageCounts = {
    all: allProducts.length,
    NEW: allProducts.filter(p => p.lifecycle?.stage === 'NEW').length,
    CURATED: allProducts.filter(p => p.lifecycle?.stage === 'CURATED').length,
    ARCHIVE: allProducts.filter(p => p.lifecycle?.stage === 'ARCHIVE').length,
    CLEARANCE: allProducts.filter(p => p.lifecycle?.stage === 'CLEARANCE').length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-lg text-slate-600">전체 상품 불러오는 중...</div>
        <div className="text-sm text-slate-400">약 1,000개 상품을 가져오고 있습니다</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-xl text-red-500 mb-4">에러: {(error as Error).message}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const buttons = [
    { id: 'all', label: '전체', count: stageCounts.all },
    { id: 'NEW', label: 'NEW', count: stageCounts.NEW },
    { id: 'CURATED', label: 'CURATED', count: stageCounts.CURATED },
    { id: 'ARCHIVE', label: 'ARCHIVE', count: stageCounts.ARCHIVE },
    { id: 'CLEARANCE', label: 'CLEARANCE', count: stageCounts.CLEARANCE },
  ];

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('ko-KR')
    : '';

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">스마트스토어 관리</h1>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isFetching ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">전체 상품</p>
          <p className="text-2xl font-bold text-slate-800">{totalCount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">현재 표시</p>
          <p className="text-2xl font-bold text-slate-800">{displayProducts.length.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">마지막 동기화</p>
          <p className="text-lg font-semibold text-slate-800">{lastUpdated}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <p className="text-slate-500 text-xs mb-1">데이터 상태</p>
          <p className="text-lg font-semibold text-emerald-600">{isCached ? '캐시됨' : '최신'}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="상품명, 상품번호, 관리코드로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${filter === btn.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {displayProducts.map((product: Product) => (
          <div
            key={product.originProductNo}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-2 text-slate-800 truncate">
                  {product.name}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>No. <span className="text-slate-700 font-mono text-xs">{product.originProductNo}</span></span>
                  {product.sellerManagementCode && (
                    <span>코드: <span className="text-slate-700 font-mono text-xs">{product.sellerManagementCode}</span></span>
                  )}
                  <span>재고: <span className="text-slate-700 font-bold">{product.stockQuantity}</span></span>
                  <span>가격: <span className="text-indigo-600 font-bold">{product.salePrice.toLocaleString()}원</span></span>
                  <span className={`font-medium ${product.statusType === 'SALE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {product.statusType === 'SALE' ? '판매중' : product.statusType === 'OUTOFSTOCK' ? '품절' : product.statusType}
                  </span>
                </div>
              </div>
              {product.lifecycle && (
                <span className={`shrink-0 ml-3 px-3 py-1 rounded-full text-xs font-bold ${
                  product.lifecycle.stage === 'NEW' ? 'bg-emerald-100 text-emerald-700' :
                  product.lifecycle.stage === 'CURATED' ? 'bg-indigo-100 text-indigo-700' :
                  product.lifecycle.stage === 'ARCHIVE' ? 'bg-slate-200 text-slate-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {product.lifecycle.stage} ({product.lifecycle.daysSince}일)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayProducts.length === 0 && !isLoading && (
        <div className="text-center py-12 text-slate-400">
          {searchTerm ? '검색 결과가 없습니다.' : '상품이 없습니다.'}
        </div>
      )}

      {displayProducts.length > 0 && (
        <div className="text-center mt-6 text-sm text-slate-400">
          {displayProducts.length.toLocaleString()}개 상품 표시 중 (전체 {totalCount.toLocaleString()}개)
        </div>
      )}
    </div>
  );
}
