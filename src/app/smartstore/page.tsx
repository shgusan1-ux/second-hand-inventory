'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Product {
  originProductNo: string;
  channelProductNo: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  regDate: string;
  lifecycle?: {
    stage: string;
    daysSince: number;
  };
}

export default function SmartstorePage() {
  const [filter, setFilter] = useState<string>('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['products', filter],
    queryFn: async ({ pageParam = 1 }) => {
      const url = filter === 'all'
        ? `/api/smartstore/products?page=${pageParam}&size=20`
        : `/api/smartstore/products?page=${pageParam}&size=20&stage=${filter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data?.hasMore) {
        return lastPage.data.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const allProducts = data?.pages.flatMap(page => page.data?.contents || []) || [];
  const totalCount = data?.pages[0]?.data?.totalCount || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">
          에러: {(error as Error).message}
        </div>
      </div>
    );
  }

  const buttons = [
    { id: 'all', label: '전체' },
    { id: 'NEW', label: 'NEW (0-30일)' },
    { id: 'CURATED', label: 'CURATED (31-60일)' },
    { id: 'ARCHIVE', label: 'ARCHIVE (61-150일)' },
    { id: 'CLEARANCE', label: 'CLEARANCE (150일+)' },
  ];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">스마트스토어 관리</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600 text-sm">전체 상품</p>
            <p className="text-2xl font-bold">{totalCount}개</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">현재 표시</p>
            <p className="text-2xl font-bold">{allProducts.length}개</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">로드된 페이지</p>
            <p className="text-2xl font-bold">{data?.pages.length || 0}페이지</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-4 py-2 rounded font-medium transition-colors ${filter === btn.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {allProducts.map((product: Product) => (
          <div
            key={product.originProductNo}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-slate-800">
                  {product.name}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>상품번호: <span className="text-slate-700 font-mono">{product.originProductNo}</span></span>
                  <span>재고: <span className="text-slate-700 font-bold">{product.stockQuantity}</span>개</span>
                  <span>가격: <span className="text-indigo-600 font-bold">{product.salePrice.toLocaleString()}원</span></span>
                </div>
                {product.lifecycle && (
                  <div className="mt-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${product.lifecycle.stage === 'NEW' ? 'bg-emerald-100 text-emerald-700' :
                        product.lifecycle.stage === 'CURATED' ? 'bg-indigo-100 text-indigo-700' :
                          product.lifecycle.stage === 'ARCHIVE' ? 'bg-slate-100 text-slate-700' :
                            'bg-amber-100 text-amber-700'
                      }`}>
                      {product.lifecycle.stage} ({product.lifecycle.daysSince}일 경과)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-bold shadow-lg shadow-blue-200"
          >
            {isFetchingNextPage ? '로딩 중...' : '더 보기 (20개 더)'}
          </button>
        </div>
      )}

      {!hasNextPage && allProducts.length > 0 && (
        <div className="text-center mt-8 text-gray-500 font-medium">
          모든 상품을 불러왔습니다.
        </div>
      )}
    </div>
  );
}
