'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductManagementTab } from '@/components/smartstore/product-management-tab';
import { CategoryManagementTab } from '@/components/smartstore/category-management-tab';
import { InventoryManagementTab } from '@/components/smartstore/inventory-management-tab';
import { PriceManagementTab } from '@/components/smartstore/price-management-tab';
import { ImageManagementTab } from '@/components/smartstore/image-management-tab';
import { AutomationWorkflowTab } from '@/components/smartstore/automation-workflow-tab';
import { SettingsTab } from '@/components/smartstore/settings-tab';

interface Product {
  originProductNo: string;
  channelProductNo: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  regDate: string;
  statusType: string;
  sellerManagementCode?: string;
  thumbnailUrl?: string | null;
  lifecycle?: {
    stage: string;
    daysSince: number;
    discount: number;
  };
  archiveInfo?: {
    category: string;
  };
  internalCategory?: string;
  archiveTier?: string;
  classification?: {
    brand: string;
    brandTier: string;
    gender: string;
    size: string;
    clothingType: string;
    clothingSubType: string;
    confidence: number;
    suggestedNaverCategory?: string;
  };
  naverCategoryId?: string;
}

interface ProgressState {
  percent: number;
  message: string;
}

interface SyncFailure {
  id: string;
  timestamp: Date;
  message: string;
}

type TabId = 'products' | 'categories' | 'inventory' | 'pricing' | 'images' | 'automation' | 'settings';

const TABS: { id: TabId; label: string; shortLabel: string }[] = [
  { id: 'products', label: '상품관리', shortLabel: '상품' },
  { id: 'categories', label: '카테고리', shortLabel: '분류' },
  { id: 'inventory', label: '재고', shortLabel: '재고' },
  { id: 'pricing', label: '가격', shortLabel: '가격' },
  { id: 'images', label: '이미지', shortLabel: '이미지' },
  { id: 'automation', label: '자동화', shortLabel: '자동화' },
  { id: 'settings', label: '설정', shortLabel: '설정' },
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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('products');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncFailures, setSyncFailures] = useState<SyncFailure[]>([]);
  const [showFailures, setShowFailures] = useState(false);
  const syncQueueRef = useRef(0);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

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
      const cacheRes = await fetch('/api/smartstore/products?cacheOnly=true');
      const cacheData = await cacheRes.json();
      if (cacheData.success && cacheData.data?.contents?.length > 0) {
        return cacheData;
      }
      return { success: true, data: { contents: [], totalCount: 0, statusCounts: { total: 0, wait: 0, sale: 0, outofstock: 0, unapproved: 0, suspension: 0, ended: 0, prohibited: 0 }, cached: false } };
    },
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const allProducts: Product[] = data?.data?.contents || [];
  const totalCount = data?.data?.totalCount || 0;
  const isCached = data?.data?.cached || false;
  const statusCounts = data?.data?.statusCounts || {
    total: 0, wait: 0, sale: 0, outofstock: 0,
    unapproved: 0, suspension: 0, ended: 0, prohibited: 0
  };

  const autoSyncTriggered = useRef(false);

  // 실제 동기화 실행
  const executeSyncOnce = async () => {
    setProgress({ percent: 0, message: '동기화 시작...' });
    try {
      const freshData = await fetchProductsWithProgress(handleProgress);
      queryClient.setQueryData(['all-products'], freshData);
    } catch (e: any) {
      const failure: SyncFailure = {
        id: Date.now().toString(),
        timestamp: new Date(),
        message: e?.message || '알 수 없는 오류',
      };
      setSyncFailures(prev => [failure, ...prev].slice(0, 20)); // 최대 20개 보관
      throw e;
    } finally {
      setProgress(null);
    }
  };

  // 대기열 포함 동기화
  const handleRefresh = async () => {
    // 이미 동기화 중이면 대기열에 추가
    if (isRefreshing) {
      syncQueueRef.current++;
      setProgress(prev => prev ? { ...prev, message: `${prev.message} (대기 +${syncQueueRef.current})` } : prev);
      return;
    }

    setIsRefreshing(true);
    try {
      await executeSyncOnce();
    } catch (e) {
      console.error('Sync failed:', e);
    }

    // 대기열 처리
    while (syncQueueRef.current > 0) {
      syncQueueRef.current--;
      try {
        await executeSyncOnce();
      } catch (e) {
        console.error('Queued sync failed:', e);
      }
    }

    setIsRefreshing(false);
  };

  // 캐시 비어있으면 자동 동기화
  useEffect(() => {
    if (!isLoading && !isFetching && !isRefreshing && !progress && allProducts.length === 0 && !autoSyncTriggered.current) {
      autoSyncTriggered.current = true;
      handleRefresh();
    }
  }, [isLoading, isFetching]);

  const handleStatusClick = (statusKey: string | null) => {
    if (activeTab !== 'inventory') setActiveTab('inventory');
    if (statusFilter === statusKey) {
      setStatusFilter(null);
    } else {
      setStatusFilter(statusKey);
    }
  };

  const displayedProducts = allProducts.filter(p => {
    let statusMatch = true;
    if (statusFilter) {
      const status = p.statusType;
      switch (statusFilter) {
        case 'sale': statusMatch = status === 'SALE'; break;
        case 'outofstock': statusMatch = status === 'OUTOFSTOCK'; break;
        case 'suspension': statusMatch = status === 'SUSPENSION'; break;
        case 'wait': statusMatch = status === 'WAIT'; break;
        case 'ended': statusMatch = status === 'DELETE'; break;
        case 'unapproved': statusMatch = status === 'UNAPPROVED'; break;
        case 'prohibited': statusMatch = status === 'PROHIBITED'; break;
      }
    }

    let searchMatch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = p.name.toLowerCase();
      const brand = p.classification?.brand?.toLowerCase() || '';
      const productNo = String(p.originProductNo);
      searchMatch = name.includes(q) || brand.includes(q) || productNo.includes(q);
    }

    return statusMatch && searchMatch;
  });

  // 실패 기록 삭제
  const clearFailure = (id: string) => {
    setSyncFailures(prev => prev.filter(f => f.id !== id));
  };

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

  const hasData = allProducts.length > 0;
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
            {hasData ? `상품 현황 · ${totalCount.toLocaleString()}건` : '상품 동기화 전'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 실패 알림 */}
          {syncFailures.length > 0 && (
            <button
              onClick={() => setShowFailures(!showFailures)}
              className="relative shrink-0 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {syncFailures.length}
              </span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-lg transition-colors active:scale-95 ${isRefreshing
                ? 'bg-blue-600 text-white'
                : hasData
                  ? 'bg-white border border-slate-200 hover:bg-slate-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
              }`}
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">
              {isRefreshing
                ? syncQueueRef.current > 0
                  ? `동기화 중 (+${syncQueueRef.current} 대기)`
                  : '동기화 중...'
                : hasData ? '새로고침' : '상품 동기화'}
            </span>
          </button>
        </div>
      </div>

      {/* 실패 기록 패널 */}
      {showFailures && syncFailures.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-700">동기화 실패 기록</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSyncFailures([])}
                className="text-[10px] text-red-400 hover:text-red-600 font-bold"
              >
                전체 삭제
              </button>
              <button onClick={() => setShowFailures(false)} className="text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {syncFailures.map(f => (
              <div key={f.id} className="flex items-start justify-between gap-2 bg-white rounded-lg p-2 border border-red-100">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-red-600 truncate">{f.message}</p>
                  <p className="text-[9px] text-red-400">{f.timestamp.toLocaleTimeString('ko-KR')}</p>
                </div>
                <button
                  onClick={() => clearFailure(f.id)}
                  className="shrink-0 text-red-300 hover:text-red-500"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 초기 로딩 / 동기화 상태 (데이터 없을 때) */}
      {!hasData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-4 text-center">
          {isLoading ? (
            // react-query 초기 로드 (캐시 확인 중)
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
                <svg className="w-7 h-7 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-600 mb-1">캐시 확인 중...</p>
              <p className="text-xs text-slate-400">저장된 상품 데이터를 불러오고 있습니다</p>
            </>
          ) : progress ? (
            // SSE 스트리밍 동기화 중
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
                <span className="text-xl font-black text-blue-600">{progress.percent}%</span>
              </div>
              <p className="text-sm font-bold text-slate-600 mb-3">네이버 상품 동기화 중</p>
              <div className="w-full max-w-xs mx-auto">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">{progress.message}</p>
              </div>
            </>
          ) : (
            // 데이터 없고 동기화도 안 함
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-50 mb-4">
                <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-600 mb-1">상품 데이터가 없습니다</p>
              <p className="text-xs text-slate-400 mb-4">상품 동기화 버튼을 눌러 네이버에서 상품을 가져오세요</p>
              <button
                onClick={handleRefresh}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-200"
              >
                상품 동기화 시작
              </button>
            </>
          )}
        </div>
      )}

      {/* 네이버 스타일 상품 현황 대시보드 */}
      {hasData && <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: null, label: '전체', count: statusCounts.total, color: 'text-slate-900', bgColor: 'bg-slate-100', activeRing: 'ring-slate-400' },
            { id: 'wait', label: '판매대기', count: statusCounts.wait, color: 'text-slate-500', bgColor: 'bg-slate-50', activeRing: 'ring-slate-300' },
            { id: 'sale', label: '판매중', count: statusCounts.sale, color: 'text-blue-600', bgColor: 'bg-blue-50', activeRing: 'ring-blue-400' },
            { id: 'outofstock', label: '품절', count: statusCounts.outofstock, color: 'text-red-500', bgColor: 'bg-red-50', activeRing: 'ring-red-400' },
            { id: 'unapproved', label: '승인대기', count: statusCounts.unapproved, color: 'text-slate-500', bgColor: 'bg-slate-50', activeRing: 'ring-slate-300' },
            { id: 'suspension', label: '판매중지', count: statusCounts.suspension, color: 'text-orange-500', bgColor: 'bg-orange-50', activeRing: 'ring-orange-400' },
            { id: 'ended', label: '판매종료', count: statusCounts.ended, color: 'text-slate-500', bgColor: 'bg-slate-50', activeRing: 'ring-slate-300' },
            { id: 'prohibited', label: '판매금지', count: statusCounts.prohibited, color: 'text-slate-500', bgColor: 'bg-slate-50', activeRing: 'ring-slate-300' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleStatusClick(item.id)}
              className={`flex flex-col items-center gap-1.5 py-2 rounded-lg transition-all active:scale-95 ${statusFilter === item.id ? 'bg-slate-50 shadow-inner' : 'hover:bg-slate-50/50'
                }`}
            >
              <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center transition-all ${statusFilter === item.id ? `ring-2 ${item.activeRing} ring-offset-2 scale-110 shadow-sm` : ''
                }`}>
                <span className={`text-sm font-black ${item.color}`}>{item.count}</span>
              </div>
              <span className={`text-[11px] font-medium transition-colors ${statusFilter === item.id ? 'text-slate-900 font-bold' : 'text-slate-500'
                }`}>{item.label}</span>
            </button>
          ))}
        </div>
        {lastUpdated && (
          <div className="text-center mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              마지막 동기화: {lastUpdated}
              {isCached && ' (캐시)'}
            </span>
          </div>
        )}
      </div>}

      {/* 탭 네비게이션 */}
      <div className="border-b border-slate-200 mb-4">
        <div className="grid grid-cols-7">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 text-xs md:text-sm font-medium text-center border-b-2 transition-colors active:bg-slate-50 ${activeTab === tab.id
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
          <ProductManagementTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'categories' && (
          <CategoryManagementTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'inventory' && (
          <InventoryManagementTab
            products={displayedProducts}
            onRefresh={handleRefresh}
            parentFilter={statusFilter}
          />
        )}
        {activeTab === 'pricing' && (
          <PriceManagementTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'images' && (
          <ImageManagementTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'automation' && (
          <AutomationWorkflowTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab onRefresh={handleRefresh} />
        )}
      </div>

      {/* 동기화 진행 팝업 (하단 고정) */}
      {progress && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-black/30 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-300">
                  동기화 중
                  {syncQueueRef.current > 0 && (
                    <span className="ml-1 text-amber-400">+{syncQueueRef.current} 대기</span>
                  )}
                </span>
              </div>
              <span className="text-sm font-black text-blue-400">{progress.percent}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 truncate">{progress.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
