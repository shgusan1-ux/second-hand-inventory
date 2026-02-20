'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ProductManagementTab, type AIClassifySettings } from '@/components/smartstore/product-management-tab';
import { CategoryManagementTab } from '@/components/smartstore/category-management-tab';
import { InventoryManagementTab } from '@/components/smartstore/inventory-management-tab';
import { PriceManagementTab } from '@/components/smartstore/price-management-tab';
import { ImageManagementTab } from '@/components/smartstore/image-management-tab';
import { AutomationWorkflowTab } from '@/components/smartstore/automation-workflow-tab';
import { SettingsTab } from '@/components/smartstore/settings-tab';
import { SyncLogsTab } from '@/components/smartstore/sync-logs-tab';
import { NaverStatusTab } from '@/components/smartstore/naver-status-tab';
import { MainDisplayTab } from '@/components/smartstore/main-display-tab';
import { VirtualFittingTab } from '@/components/smartstore/virtual-fitting-tab';

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
    discountRate: number;
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

type TabId = 'products' | 'main-new' | 'main-curated' | 'main-archive' | 'categories' | 'inventory' | 'pricing' | 'image-badge' | 'image-fitting' | 'automation' | 'naver-status' | 'logs' | 'settings';

const TOP_TABS = [
  { id: 'products', label: '상품관리', shortLabel: '상품' },
  { id: 'main-display', label: '메인진열관리', shortLabel: '메인진열' },
  { id: 'image-display', label: '이미지', shortLabel: '이미지' },
  { id: 'naver-status', label: '네이버 현황', shortLabel: '현황' },
  { id: 'logs', label: '전송기록', shortLabel: '기록' },
  { id: 'settings', label: '설정', shortLabel: '설정' },
];

const MAIN_DISPLAY_SUB_TABS: { id: TabId; label: string }[] = [
  { id: 'main-new', label: 'NEW' },
  { id: 'main-curated', label: 'CURATED' },
  { id: 'main-archive', label: 'ARCHIVE' },
];

const IMAGE_SUB_TABS: { id: TabId; label: string }[] = [
  { id: 'image-badge', label: '뱃지' },
  { id: 'image-fitting', label: '가상피팅' },
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

  // GRADE 동기화 (탭 전환해도 유지되는 하단 팝업)
  const [syncingGrades, setSyncingGrades] = useState(false);
  const [gradeProgress, setGradeProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // AI 분류 (팝업식, 탭 전환해도 유지)
  const [classifyingAI, setClassifyingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number; message: string; results: any[] } | null>(null);

  // 전시 카테고리 동기화 (Shared)
  const [syncingDisplay, setSyncingDisplay] = useState(false);
  const [displaySyncProgress, setDisplaySyncProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  const syncExhibition = async (category: string, productNos: string[]) => {
    if (!productNos.length) {
      toast.error('동기화할 상품이 없습니다');
      return;
    }

    setSyncingDisplay(true);
    setDisplaySyncProgress({ current: 0, total: productNos.length, message: '동기화 시작...' });

    try {
      const res = await fetch('/api/smartstore/exhibition/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos, internalCategory: category }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림 없음');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress' || data.type === 'result') {
              setDisplaySyncProgress({
                current: data.current || 0,
                total: data.total || productNos.length,
                message: data.message || '',
              });
            }
            if (data.type === 'result' && data.success) {
              // toast.success(data.message, { duration: 1000 });
            }
            if (data.type === 'complete') {
              toast.success(data.message);
            }
          } catch { }
        }
      }
    } catch (err: any) {
      toast.error('동기화 오류: ' + err.message);
    } finally {
      setSyncingDisplay(false);
      setDisplaySyncProgress(null);
    }
  };

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

  // GRADE 동기화 (하단 팝업으로 탭 전환해도 유지)
  const syncGrades = useCallback(async () => {
    if (syncingGrades) return;
    setSyncingGrades(true);
    setGradeProgress({ current: 0, total: 0, message: '등급 동기화 시작...' });

    try {
      const res = await fetch('/api/smartstore/products/sync-grades', { method: 'POST' });
      if (!res.body) throw new Error('스트림 없음');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'start') {
              setGradeProgress({ current: 0, total: event.total, message: `${event.total}개 상품 등급 동기화` });
            } else if (event.type === 'progress') {
              setGradeProgress({ current: event.current, total: event.total, message: `${event.product}... ${event.message}` });
            } else if (event.type === 'complete') {
              setGradeProgress({ current: event.total, total: event.total, message: `완료: ${event.success}개 성공` });
              fetch('/api/smartstore/products?invalidateCache=true').catch(() => { });
              setTimeout(() => { setGradeProgress(null); setSyncingGrades(false); }, 3000);
              return;
            }
          } catch { /* 무시 */ }
        }
      }
    } catch (err: any) {
      setGradeProgress({ current: 0, total: 0, message: `오류: ${err.message}` });
      setTimeout(() => { setGradeProgress(null); setSyncingGrades(false); }, 3000);
    }
  }, [syncingGrades]);

  // AI 아카이브 분류 (팝업식)
  // 1개 상품의 React Query 캐시를 즉시 업데이트하는 헬퍼
  const updateProductCache = useCallback((productId: string, category: string, brandAnalysis?: any, visualAnalysis?: any, confidence?: number) => {
    queryClient.setQueryData(['all-products'], (old: any) => {
      if (!old?.data?.contents) return old;
      return {
        ...old,
        data: {
          ...old.data,
          contents: old.data.contents.map((p: any) => {
            if (p.originProductNo === productId) {
              // classification 객체 업데이트 (통계 반영용)
              const newClassification = {
                brand: brandAnalysis?.brand || p.classification?.brand || '',
                brandTier: category || p.classification?.brandTier || 'OTHER',
                gender: visualAnalysis?.category === 'UNISEX ARCHIVE' ? 'Unisex' : (brandAnalysis?.gender || 'UNKNOWN'),
                size: visualAnalysis?.size || '',
                clothingType: visualAnalysis?.clothingType || 'UNKNOWN',
                clothingSubType: visualAnalysis?.clothingSubType || '',
                confidence: confidence || p.classification?.confidence || 0,
                suggestedNaverCategory: p.classification?.suggestedNaverCategory
              };

              return {
                ...p,
                internalCategory: category,
                archiveTier: category,
                classification: newClassification
              };
            }
            return p;
          }),
        },
      };
    });
  }, [queryClient]);

  const classifyWithAI = useCallback(async (selectedProducts: { id: string; name: string; imageUrl: string }[], settings?: AIClassifySettings) => {
    if (classifyingAI || selectedProducts.length === 0) return;
    setClassifyingAI(true);
    setAiProgress({ current: 0, total: selectedProducts.length, message: 'AI 분류 시작...', results: [] });

    let savedCount = 0;
    let hadError = false;

    try {
      const res = await fetch('/api/smartstore/automation/archive-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: selectedProducts,
          model: settings?.model || 'flash',
          skipClassified: settings?.skipClassified ?? true,
          threshold: settings?.threshold ?? 25,
          // UI 5개 가중치 → 엔진 6개 가중치 변환 (brand를 brand+brandDb로 분리)
          weights: settings?.weights ? {
            ai: settings.weights.ai,
            brand: Math.round(settings.weights.brand * 0.4),
            brandDb: Math.round(settings.weights.brand * 0.6),
            visual: settings.weights.image,
            keyword: settings.weights.keyword,
            context: settings.weights.context,
          } : undefined,
        }),
      });

      if (!res.body) throw new Error('SSE 스트림 없음');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const allResults: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'progress') {
              setAiProgress(prev => prev ? { ...prev, current: event.current, message: event.message } : prev);
            } else if (event.type === 'result') {
              updateProductCache(
                event.productId,
                event.category,
                event.brandAnalysis,
                event.visualAnalysis,
                event.confidence
              );
              savedCount++;
              allResults.push(event);
              setAiProgress(prev => prev ? { ...prev, current: event.completed || event.current, message: `${event.product} → ${event.category}`, results: [...allResults] } : prev);
            } else if (event.type === 'skipped') {
              updateProductCache(event.productId, event.category);
              allResults.push(event);
              setAiProgress(prev => prev ? { ...prev, message: event.message, results: [...allResults] } : prev);
            } else if (event.type === 'error') {
              updateProductCache(event.productId, 'ARCHIVE');
              savedCount++;
              allResults.push({ ...event, category: 'ARCHIVE' });
            } else if (event.type === 'start') {
              const msg = event.skipped > 0
                ? `${event.total}개 중 ${event.skipped}개 스킵 → ${event.toProcess}개 분류 시작`
                : event.message;
              setAiProgress(prev => prev ? { ...prev, total: event.toProcess || event.total, message: msg } : prev);
            } else if (event.type === 'complete') {
              setAiProgress(prev => prev ? { ...prev, current: event.toProcess || event.total, message: event.message } : prev);
              return; // finally 블록에서 캐시 무효화 + cleanup 처리
            }
          } catch { /* JSON 파싱 실패 무시 */ }
        }
      }

      // while 루프가 done=true로 끝난 경우: 버퍼에 남은 이벤트 처리
      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6));
          if (event.type === 'result') {
            updateProductCache(event.productId, event.category, event.brandAnalysis, event.visualAnalysis, event.confidence);
            savedCount++;
          } else if (event.type === 'complete') {
            setAiProgress(prev => prev ? { ...prev, current: event.toProcess || event.total, message: event.message } : prev);
          }
        } catch { /* 파싱 실패 무시 */ }
      }
    } catch (err: any) {
      hadError = true;
      const msg = savedCount > 0
        ? `연결 끊김: ${savedCount}개 저장됨 (DB 반영 완료). 나머지는 다시 실행하세요.`
        : `오류: ${err.message}`;
      setAiProgress({ current: savedCount, total: selectedProducts.length, message: msg, results: [] });
    } finally {
      // 1. 서버 캐시 무효화 (다른 사용자 / 다음 페이지 로드용)
      try { await fetch('/api/smartstore/products?invalidateCache=true&_t=' + Date.now()); } catch { }

      // 2. updateProductCache가 SSE 중 이미 정확한 데이터를 반영했으므로
      //    즉시 invalidateQueries하면 다른 Vercel 인스턴스의 오래된 캐시로
      //    정확한 인메모리 데이터를 덮어쓰는 문제 발생 → 10초 뒤 백그라운드 동기화
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['all-products'] });
      }, 10000);

      // 3. 지연 cleanup
      setTimeout(() => {
        setAiProgress(null);
        setClassifyingAI(false);
      }, hadError ? 5000 : 3000);
    }
  }, [classifyingAI, queryClient, updateProductCache]);

  const handleStatusClick = (statusKey: string | null) => {
    if (activeTab !== 'inventory') setActiveTab('inventory');
    if (statusFilter === statusKey) {
      setStatusFilter(null);
    } else {
      setStatusFilter(statusKey);
    }
  };

  const displayedProducts = useMemo(() => {
    return allProducts.filter(p => {
      if (statusFilter) {
        const status = p.statusType;
        switch (statusFilter) {
          case 'sale': if (status !== 'SALE') return false; break;
          case 'outofstock': if (status !== 'OUTOFSTOCK') return false; break;
          case 'suspension': if (status !== 'SUSPENSION') return false; break;
          case 'wait': if (status !== 'WAIT') return false; break;
          case 'ended': if (status !== 'DELETE') return false; break;
          case 'unapproved': if (status !== 'UNAPPROVED') return false; break;
          case 'prohibited': if (status !== 'PROHIBITED') return false; break;
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = p.name.toLowerCase();
        const brand = p.classification?.brand?.toLowerCase() || '';
        const productNo = String(p.originProductNo);
        if (!name.includes(q) && !brand.includes(q) && !productNo.includes(q)) return false;
      }

      return true;
    });
  }, [allProducts, statusFilter, searchQuery]);

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
    <div className="w-full max-w-7xl mx-auto overflow-x-hidden space-y-6">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">스마트스토어</h1>
          <p className="text-sm text-slate-400 mt-1">
            {hasData ? `상품 현황 · ${totalCount.toLocaleString()}건` : '상품 동기화 전'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncFailures.length > 0 && (
            <button
              onClick={() => setShowFailures(!showFailures)}
              className="relative shrink-0 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors active:scale-95"
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
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-95 ${isRefreshing
              ? 'bg-slate-900 text-white shadow-lg'
              : hasData
                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
              }`}
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">
              {isRefreshing
                ? syncQueueRef.current > 0
                  ? `동기화 중 (+${syncQueueRef.current})`
                  : '동기화 중...'
                : hasData ? '새로고침' : '상품 동기화'}
            </span>
          </button>
        </div>
      </div>

      {/* 실패 기록 패널 */}
      {showFailures && syncFailures.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-red-700">동기화 실패 기록</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setSyncFailures([])} className="text-[10px] text-red-400 hover:text-red-600 font-bold">전체 삭제</button>
              <button onClick={() => setShowFailures(false)} className="text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {syncFailures.map(f => (
              <div key={f.id} className="flex items-start justify-between gap-3 bg-white rounded-lg p-3 border border-red-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-red-600 truncate">{f.message}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">{f.timestamp.toLocaleTimeString('ko-KR')}</p>
                </div>
                <button onClick={() => clearFailure(f.id)} className="shrink-0 text-red-300 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 초기 로딩 / 동기화 상태 (데이터 없을 때) */}
      {!hasData && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm ag-float-1 ag-card">
          {isLoading ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 mb-6">
                <svg className="w-8 h-8 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">캐시 확인 중...</p>
              <p className="text-xs text-slate-400">저장된 상품 데이터를 불러오고 있습니다</p>
            </>
          ) : progress ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 mb-6">
                <span className="text-2xl font-black text-slate-900">{progress.percent}%</span>
              </div>
              <p className="text-sm font-bold text-slate-700 mb-4">네이버 상품 동기화 중</p>
              <div className="w-full max-w-xs mx-auto">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3">{progress.message}</p>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 mb-6">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-base font-bold text-slate-700 mb-1">상품 데이터가 없습니다</p>
              <p className="text-sm text-slate-400 mb-6">상품 동기화 버튼을 눌러 네이버에서 상품을 가져오세요</p>
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
              >
                상품 동기화 시작
              </button>
            </>
          )}
        </div>
      )}

      {/* KPI 상품 현황 카드 */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: null, label: '전체', count: statusCounts.total, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', floatClass: 'ag-float-1' },
            { id: 'sale', label: '판매중', count: statusCounts.sale, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', iconBg: 'bg-green-50', iconColor: 'text-green-600', floatClass: 'ag-float-2' },
            { id: 'outofstock', label: '품절', count: statusCounts.outofstock, icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', iconBg: 'bg-red-50', iconColor: 'text-red-500', floatClass: 'ag-float-5' },
            { id: 'suspension', label: '판매중지', count: statusCounts.suspension, icon: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', floatClass: 'ag-float-4' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleStatusClick(item.id)}
              className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col gap-3 text-left transition-all active:scale-95 ${item.floatClass} ag-card ${statusFilter === item.id ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:shadow-md'
                }`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl ${item.iconBg}`}>
                  <svg className={`w-5 h-5 ${item.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                {statusFilter === item.id && (
                  <span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded-full">활성</span>
                )}
              </div>
              <p className="text-slate-500 text-sm font-medium">{item.label}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white -mt-1">{item.count.toLocaleString()}</h3>
            </button>
          ))}
          {lastUpdated && (
            <div className="col-span-full text-center pt-1">
              <span className="text-[10px] text-slate-400 font-medium">
                마지막 동기화: {lastUpdated}{isCached && ' (캐시)'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="space-y-4">
        {/* 대분류 */}
        <div className="border-b border-slate-200 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {TOP_TABS.map(tab => {
              const isActive = tab.id === 'main-display'
                ? activeTab.startsWith('main-')
                : tab.id === 'image-display'
                  ? activeTab.startsWith('image-')
                  : activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'main-display') {
                      setActiveTab('main-new');
                    } else if (tab.id === 'image-display') {
                      setActiveTab('image-badge');
                    } else {
                      setActiveTab(tab.id as TabId);
                    }
                  }}
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex-shrink-0 ${isActive
                    ? 'border-slate-900 text-slate-900 dark:text-white dark:border-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  <span className="md:hidden">{tab.shortLabel}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 메인진열 중분류 (메인진열 탭 활성화 시에만 노출) */}
        {activeTab.startsWith('main-') && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            {MAIN_DISPLAY_SUB_TABS.map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveTab(sub.id)}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === sub.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* 이미지 중분류 (이미지 탭 활성화 시에만 노출) */}
        {activeTab.startsWith('image-') && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            {IMAGE_SUB_TABS.map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveTab(sub.id)}
                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === sub.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="w-full overflow-x-hidden">
        {activeTab === 'products' && (
          <ProductManagementTab products={displayedProducts} onRefresh={handleRefresh} onSyncGrades={syncGrades} syncingGrades={syncingGrades} onClassifyAI={classifyWithAI} classifyingAI={classifyingAI} onSyncExhibition={syncExhibition} syncingDisplay={syncingDisplay} />
        )}
        {activeTab === 'main-new' && (
          <MainDisplayTab products={displayedProducts} forcedCategory="NEW" onSyncExhibition={syncExhibition} syncingDisplay={syncingDisplay} />
        )}
        {activeTab === 'main-curated' && (
          <MainDisplayTab products={displayedProducts} forcedCategory="CURATED" onSyncExhibition={syncExhibition} syncingDisplay={syncingDisplay} />
        )}
        {activeTab === 'main-archive' && (
          <MainDisplayTab products={displayedProducts} forcedCategory="ARCHIVE" onSyncExhibition={syncExhibition} syncingDisplay={syncingDisplay} />
        )}
        {activeTab === 'image-badge' && (
          <ImageManagementTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'naver-status' && (
          <NaverStatusTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'logs' && (
          <SyncLogsTab />
        )}
        {activeTab === 'image-fitting' && (
          <VirtualFittingTab products={displayedProducts} onRefresh={handleRefresh} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab onRefresh={handleRefresh} />
        )}
      </div>

      {/* 동기화 진행 팝업 */}
      {progress && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-50">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-300">
                  동기화 중{syncQueueRef.current > 0 && <span className="ml-1 text-amber-400">+{syncQueueRef.current} 대기</span>}
                </span>
              </div>
              <span className="text-sm font-black text-blue-400">{progress.percent}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-400 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 truncate">{progress.message}</p>
          </div>
        </div>
      )}

      {/* GRADE 동기화 팝업 */}
      {gradeProgress && (
        <div className={`fixed ${progress ? 'bottom-28' : 'bottom-6'} left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm z-50`}>
          <div className="bg-emerald-950 text-white rounded-2xl shadow-2xl p-4 ring-1 ring-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300">등급 동기화</span>
              </div>
              {gradeProgress.total > 0 && (
                <span className="text-xs font-black text-emerald-400">{gradeProgress.current}/{gradeProgress.total}</span>
              )}
            </div>
            {gradeProgress.total > 0 && (
              <div className="w-full bg-emerald-900 rounded-full h-1.5 overflow-hidden mb-2">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.round((gradeProgress.current / gradeProgress.total) * 100)}%` }} />
              </div>
            )}
            <p className="text-[10px] text-emerald-400/70 truncate">{gradeProgress.message}</p>
          </div>
        </div>
      )}

      {/* AI 분류 팝업 */}
      {aiProgress && (
        <div className={`fixed ${progress && gradeProgress ? 'bottom-48' : progress || gradeProgress ? 'bottom-28' : 'bottom-6'} left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm z-50`}>
          <div className="bg-violet-950 text-white rounded-2xl shadow-2xl p-4 ring-1 ring-violet-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs font-bold text-violet-300">AI 아카이브 분류</span>
              </div>
              {aiProgress.total > 0 && (
                <span className="text-xs font-black text-violet-400">{aiProgress.current}/{aiProgress.total}</span>
              )}
            </div>
            {aiProgress.total > 0 && (
              <div className="w-full bg-violet-900 rounded-full h-1.5 overflow-hidden mb-2">
                <div className="bg-violet-400 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.round((aiProgress.current / aiProgress.total) * 100)}%` }} />
              </div>
            )}
            <p className="text-[10px] text-violet-400/70 truncate">{aiProgress.message}</p>
          </div>
        </div>
      )}

      {/* 전시 카테고리 동기화 진행 팝업 */}
      {displaySyncProgress && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 ag-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900">네이버 전시 동기화 중</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {Math.round((displaySyncProgress.current / displaySyncProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(displaySyncProgress.current / displaySyncProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate">{displaySyncProgress.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
