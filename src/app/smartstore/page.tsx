'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { ProductManagementTab } from '@/components/smartstore/product-management-tab';
import { CategoryManagementTab } from '@/components/smartstore/category-management-tab';
import { InventoryManagementTab } from '@/components/smartstore/inventory-management-tab';
import { PriceManagementTab } from '@/components/smartstore/price-management-tab';
import { ImageManagementTab } from '@/components/smartstore/image-management-tab';
import { AutomationWorkflowTab } from '@/components/smartstore/automation-workflow-tab';

interface Product {
  originProductNo: string;
  channelProductNo: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  regDate: string;
  statusType: string;
  sellerManagementCode?: string;
  images?: any;
  lifecycle?: {
    stage: string;
    daysSince: number;
  };
  archiveInfo?: {
    category: string;
  };
  internalCategory?: string;
}

interface ProgressState {
  percent: number;
  message: string;
}

type TabId = 'products' | 'categories' | 'inventory' | 'pricing' | 'images' | 'automation';

const TABS: { id: TabId; label: string; shortLabel: string }[] = [
  { id: 'products', label: '상품관리', shortLabel: '상품' },
  { id: 'categories', label: '카테고리', shortLabel: '분류' },
  { id: 'inventory', label: '재고', shortLabel: '재고' },
  { id: 'pricing', label: '가격', shortLabel: '가격' },
  { id: 'images', label: '이미지', shortLabel: '이미지' },
  { id: 'automation', label: '자동화', shortLabel: '자동화' },
];

async function fetchProductsWithProgress(
  onProgress: (progress: ProgressState) => void
): Promise<any> {
  const response = await fetch('/api/smartstore/products?fetchAll=true&stream=true');

  if (!response.ok) throw new Error('Failed to fetch');
  if (!response.body) {
    return response.json();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalData: any = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'progress') {
            onProgress({ percent: event.percent, message: event.message });
          } else if (event.type === 'complete') {
            finalData = { success: true, data: event.data };
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
  }

  if (!finalData) throw new Error('Stream ended without data');
  return finalData;
}

export default function SmartstorePage() {
  const [activeTab, setActiveTab] = useState<TabId>('products');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleProgress = useCallback((p: ProgressState) => {
    setProgress(p);
  }, []);

  const {
    data,
    isLoading,
    error,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      setProgress({ percent: 0, message: '시작...' });
      const result = await fetchProductsWithProgress(handleProgress);
      setProgress(null);
      return result;
    },
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const allProducts: Product[] = data?.data?.contents || [];
  const totalCount = data?.data?.totalCount || 0;
  const isCached = data?.data?.cached || false;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setProgress({ percent: 0, message: '새로고침 시작...' });
    queryClient.removeQueries({ queryKey: ['all-products'] });
    try {
      const freshData = await fetchProductsWithProgress(handleProgress);
      queryClient.setQueryData(['all-products'], freshData);
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    setProgress(null);
    setIsRefreshing(false);
  };

  // 스테이지별 카운트
  const stageCounts = {
    NEW: allProducts.filter(p => p.lifecycle?.stage === 'NEW').length,
    CURATED: allProducts.filter(p => p.lifecycle?.stage === 'CURATED').length,
    ARCHIVE: allProducts.filter(p => p.lifecycle?.stage === 'ARCHIVE').length,
    CLEARANCE: allProducts.filter(p => p.lifecycle?.stage === 'CLEARANCE').length,
  };

  // 로딩
  if (isLoading || progress) {
    const pct = progress?.percent || 0;
    const msg = progress?.message || '준비 중...';

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{msg}</span>
            <span className="text-sm font-bold text-blue-600">{pct}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            네이버 스마트스토어에서 전체 상품을 동기화하고 있습니다
          </p>
        </div>
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base active:bg-blue-800"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('ko-KR')
    : '';

  return (
    <div className="w-full max-w-7xl mx-auto overflow-x-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">스마트스토어</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalCount.toLocaleString()}개 상품
            {lastUpdated && <> · {lastUpdated}</>}
            {isCached && <span className="text-emerald-500"> (캐시)</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching || isRefreshing}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors active:bg-slate-100"
        >
          <svg className={`w-4 h-4 ${(isFetching || isRefreshing) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">{(isFetching || isRefreshing) ? '동기화 중...' : '새로고침'}</span>
        </button>
      </div>

      {/* 스테이지 카운트 - 4열 그리드, 좌우 스크롤 없음 */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <div key={stage} className="bg-white rounded-lg border px-2 py-1.5 text-center">
            <p className={`text-[10px] font-bold leading-tight ${
              stage === 'NEW' ? 'text-emerald-600' :
              stage === 'CURATED' ? 'text-indigo-600' :
              stage === 'ARCHIVE' ? 'text-slate-500' :
              'text-amber-600'
            }`}>{stage}</p>
            <p className="text-sm font-bold text-slate-800">{count}</p>
          </div>
        ))}
      </div>

      {/* 탭 네비게이션 - 6열 균등 분할 */}
      <div className="border-b border-slate-200 mb-4">
        <div className="grid grid-cols-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 text-xs md:text-sm font-medium text-center border-b-2 transition-colors active:bg-slate-50 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="md:hidden">{tab.shortLabel}</span>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="w-full overflow-x-hidden">
        {activeTab === 'products' && (
          <ProductManagementTab products={allProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'categories' && (
          <CategoryManagementTab products={allProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'inventory' && (
          <InventoryManagementTab products={allProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'pricing' && (
          <PriceManagementTab products={allProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'images' && (
          <ImageManagementTab products={allProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'automation' && (
          <AutomationWorkflowTab products={allProducts} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  );
}
