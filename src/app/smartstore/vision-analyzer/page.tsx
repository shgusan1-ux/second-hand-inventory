'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  thumbnailUrl?: string | null;
  classification?: {
    visionStatus?: string;
  };
}

interface FailureDetail {
  productNo: string;
  productName: string;
  error: string;
  timestamp: string;
}

interface BatchResult {
  completed: number;
  failed: number;
  total: number;
  percent: number;
  currentProduct?: string;
  currentProductNo?: string;
  failures?: FailureDetail[];
}

type AnalyzerState = 'idle' | 'loading' | 'running' | 'paused' | 'done';

export default function VisionAnalyzerPage() {
  const [state, setState] = useState<AnalyzerState>('idle');
  const [products, setProducts] = useState<Product[]>([]);
  const [eligible, setEligible] = useState<Product[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [allFailures, setAllFailures] = useState<FailureDetail[]>([]);
  const [autoStats, setAutoStats] = useState({ totalAnalyzed: 0, totalFailed: 0, batchCount: 0 });
  const [completedItems, setCompletedItems] = useState<{ productNo: string; productName: string }[]>([]);

  const autoModeRef = useRef(false);
  const analyzedIdsRef = useRef<Set<string>>(new Set());

  // 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'running') {
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  // 페이지 로드 시 상품 가져오기
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setState('loading');
    try {
      const res = await fetch('/api/smartstore/products?cacheOnly=true');
      const data = await res.json();
      const all: Product[] = data?.data?.contents || [];
      setProducts(all);
      const elig = all.filter(p => p.thumbnailUrl && (!p.classification?.visionStatus || p.classification.visionStatus === 'none'));
      setEligible(elig);
      setState('idle');
    } catch {
      setState('idle');
    }
  };

  // 단일 배치 실행
  const runSingleBatch = useCallback(async (batchProducts: Product[]): Promise<{ completed: number; failed: number; failures: FailureDetail[] }> => {
    const batch = batchProducts.map(p => ({
      originProductNo: p.originProductNo,
      name: p.name,
      imageUrl: p.thumbnailUrl!
    }));

    setBatchProgress({ completed: 0, failed: 0, total: batch.length, percent: 0 });

    let completed = 0, failed = 0;
    let failures: FailureDetail[] = [];

    const res = await fetch('/api/smartstore/vision/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: batch, concurrency: 2, limit: batch.length })
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                setBatchProgress({
                  completed: data.completed,
                  failed: data.failed,
                  total: data.total,
                  percent: data.percent,
                  currentProduct: data.currentProduct,
                  currentProductNo: data.currentProductNo,
                  failures: data.failures
                });
                // 완료 아이템 추적
                if (data.completed > completed) {
                  const justDone = batchProducts[completed];
                  if (justDone) {
                    setCompletedItems(prev => [...prev, { productNo: justDone.originProductNo, productName: justDone.name }]);
                  }
                }
                completed = data.completed;
                failed = data.failed;
                failures = data.failures || [];
              } else if (data.type === 'complete') {
                completed = data.completed;
                failed = data.failed;
                failures = data.failures || [];
                setBatchProgress({ completed, failed, total: data.total, percent: 100, failures });
              }
            } catch { }
          }
        }
      }
    }

    return { completed, failed, failures };
  }, []);

  // 자동 분석 시작
  const startAutoAnalysis = useCallback(async () => {
    autoModeRef.current = true;
    analyzedIdsRef.current = new Set();
    setState('running');
    setElapsedSeconds(0);
    setAutoStats({ totalAnalyzed: 0, totalFailed: 0, batchCount: 0 });
    setAllFailures([]);
    setCompletedItems([]);

    const BATCH_SIZE = 10;
    const DELAY_BETWEEN = 3000;

    let totalAnalyzed = 0;
    let totalFailed = 0;
    let batchCount = 0;

    try {
      while (autoModeRef.current) {
        const remaining = eligible.filter(p => !analyzedIdsRef.current.has(p.originProductNo));

        if (remaining.length === 0) {
          break;
        }

        const batch = remaining.slice(0, BATCH_SIZE);
        batchCount++;
        batch.forEach(p => analyzedIdsRef.current.add(p.originProductNo));

        try {
          const result = await runSingleBatch(batch);
          totalAnalyzed += result.completed;
          totalFailed += result.failed;
          if (result.failures.length > 0) {
            setAllFailures(prev => [...prev, ...result.failures]);
          }
          setAutoStats({ totalAnalyzed, totalFailed, batchCount });
        } catch (err: any) {
          totalFailed += batch.length;
          setAllFailures(prev => [...prev, ...batch.map(p => ({
            productNo: p.originProductNo,
            productName: p.name,
            error: err?.message || '배치 실행 실패',
            timestamp: new Date().toISOString()
          }))]);
          setAutoStats({ totalAnalyzed, totalFailed, batchCount });
        }

        if (autoModeRef.current) {
          await new Promise(r => setTimeout(r, DELAY_BETWEEN));
        }
      }
    } finally {
      autoModeRef.current = false;
      setState('done');
    }
  }, [eligible, runSingleBatch]);

  // 중지
  const stopAutoAnalysis = () => {
    autoModeRef.current = false;
    setState('done');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const analyzedPercent = eligible.length > 0
    ? Math.round((analyzedIdsRef.current.size / eligible.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${state === 'running' ? 'bg-emerald-400 animate-pulse' : state === 'done' ? 'bg-blue-400' : 'bg-slate-600'}`} />
            <div>
              <h1 className="text-sm font-bold">Gemini Vision 자동 분석기</h1>
              <p className="text-[10px] text-slate-500 font-mono">gemini-1.5-flash · 배치 10개 · 동시성 2</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">{formatTime(elapsedSeconds)}</span>
            {state === 'running' ? (
              <button onClick={stopAutoAnalysis} className="px-4 py-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 rounded-lg transition-colors active:scale-95">
                중지
              </button>
            ) : (
              <button
                onClick={startAutoAnalysis}
                disabled={state === 'loading' || eligible.length === 0}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors active:scale-95 disabled:opacity-40"
              >
                {state === 'done' ? '다시 시작' : '분석 시작'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* 전체 현황 카드 */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase">전체 상품</p>
            <p className="text-lg font-black text-slate-300">{products.length}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 text-center">
            <p className="text-[9px] text-violet-400 font-bold uppercase">미분석</p>
            <p className="text-lg font-black text-violet-400">{eligible.length}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-emerald-900/50 p-3 text-center">
            <p className="text-[9px] text-emerald-400 font-bold uppercase">분석 완료</p>
            <p className="text-lg font-black text-emerald-400">{autoStats.totalAnalyzed}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-red-900/50 p-3 text-center">
            <p className="text-[9px] text-red-400 font-bold uppercase">실패</p>
            <p className="text-lg font-black text-red-400">{autoStats.totalFailed}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-blue-900/50 p-3 text-center">
            <p className="text-[9px] text-blue-400 font-bold uppercase">배치 #</p>
            <p className="text-lg font-black text-blue-400">{autoStats.batchCount}</p>
          </div>
        </div>

        {/* 전체 진행률 바 */}
        {state !== 'idle' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400">전체 진행률</span>
              <span className="text-sm font-black text-emerald-400">{analyzedPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${analyzedPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
              <span>{analyzedIdsRef.current.size} / {eligible.length}개 처리</span>
              <span>경과: {formatTime(elapsedSeconds)}</span>
            </div>
          </div>
        )}

        {/* 현재 배치 진행 상태 */}
        {batchProgress && state === 'running' && (
          <div className="bg-slate-900 rounded-xl border border-violet-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs font-bold text-violet-300">현재 배치</span>
              </div>
              <span className="text-xs font-mono text-violet-400">{batchProgress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                style={{ width: `${batchProgress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">{batchProgress.completed + batchProgress.failed} / {batchProgress.total}개</span>
              {batchProgress.currentProduct && (
                <span className="text-violet-400 truncate max-w-[200px]">
                  분석 중: {batchProgress.currentProduct}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2컬럼: 완료 로그 + 실패 로그 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 완료 로그 */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">분석 완료 로그</span>
              <span className="text-[10px] text-slate-500 font-mono">{completedItems.length}건</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
              {completedItems.length === 0 ? (
                <div className="p-6 text-center text-slate-600 text-xs">
                  {state === 'idle' ? '분석을 시작하면 결과가 여기에 표시됩니다' : '대기 중...'}
                </div>
              ) : (
                [...completedItems].reverse().map((item, i) => (
                  <div key={i} className="px-4 py-2 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">#{item.productNo}</span>
                      <span className="text-[11px] text-slate-300 truncate">{item.productName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 실패 로그 */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-red-400">실패 상세 로그</span>
              <span className="text-[10px] text-slate-500 font-mono">{allFailures.length}건</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
              {allFailures.length === 0 ? (
                <div className="p-6 text-center text-slate-600 text-xs">
                  실패 건이 없습니다
                </div>
              ) : (
                [...allFailures].reverse().map((f, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">#{f.productNo}</span>
                      <span className="text-[11px] text-slate-300 truncate">{f.productName}</span>
                    </div>
                    <div className="ml-5 bg-red-950/50 border border-red-900/30 rounded-md px-2.5 py-1.5">
                      <p className="text-[10px] text-red-400 font-mono leading-relaxed break-all">{f.error}</p>
                      <p className="text-[9px] text-red-600 mt-0.5">{new Date(f.timestamp).toLocaleTimeString('ko-KR')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 완료 요약 */}
        {state === 'done' && (
          <div className="bg-gradient-to-r from-blue-950 to-slate-900 rounded-xl border border-blue-800/50 p-5 text-center">
            <p className="text-lg font-black text-blue-300 mb-1">분석 완료</p>
            <p className="text-xs text-slate-400 mb-4">
              총 {autoStats.batchCount}개 배치 · {formatTime(elapsedSeconds)} 소요
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="bg-emerald-950/50 rounded-lg p-3 border border-emerald-800/30">
                <p className="text-2xl font-black text-emerald-400">{autoStats.totalAnalyzed}</p>
                <p className="text-[10px] text-emerald-500 font-bold">성공</p>
              </div>
              <div className="bg-red-950/50 rounded-lg p-3 border border-red-800/30">
                <p className="text-2xl font-black text-red-400">{autoStats.totalFailed}</p>
                <p className="text-[10px] text-red-500 font-bold">실패</p>
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => { loadProducts(); setState('idle'); setAutoStats({ totalAnalyzed: 0, totalFailed: 0, batchCount: 0 }); setAllFailures([]); setCompletedItems([]); setElapsedSeconds(0); }}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                새로고침 후 재시작
              </button>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                창 닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
