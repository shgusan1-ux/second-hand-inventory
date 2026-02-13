'use client';

import { useState, useEffect, useCallback } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  thumbnailUrl?: string | null;
  regDate?: string;
  lifecycle?: { stage: string; daysSince: number; discount: number };
  internalCategory?: string;
  classification?: {
    brand?: string;
    brandTier?: string;
  };
}

interface SendItem {
  originProductNo: string;
  salePrice?: number;
  name?: string;
  statusType?: string;
  discountRate?: number;
}

interface SendResult {
  productNo: string;
  productName: string;
  success: boolean;
  error?: string;
  changes?: string[];
}

type SenderState = 'loading' | 'ready' | 'sending' | 'done';

export default function ProductSenderPage() {
  const [state, setState] = useState<SenderState>('loading');
  const [products, setProducts] = useState<Product[]>([]);
  const [sendQueue, setSendQueue] = useState<SendItem[]>([]);
  const [results, setResults] = useState<SendResult[]>([]);
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0, percent: 0, current: '' });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sendMode, setSendMode] = useState<'price' | 'status'>('price');

  // 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'sending') {
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  // 상품 로드
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

      // 라이프사이클 할인이 있는 상품만 자동 선택
      const priceChanges = all.filter(p => p.lifecycle && p.lifecycle.discount > 0).map(p => {
        return {
          originProductNo: p.originProductNo,
          discountRate: p.lifecycle!.discount
        };
      });
      setSendQueue(priceChanges);
      setState('ready');
    } catch {
      setState('ready');
    }
  };

  // 송신 실행
  const startSend = useCallback(async () => {
    if (sendQueue.length === 0) return;

    setState('sending');
    setElapsedSeconds(0);
    setResults([]);
    setProgress({ completed: 0, failed: 0, total: sendQueue.length, percent: 0, current: '' });

    try {
      const res = await fetch('/api/smartstore/products/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: sendQueue })
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
                  setProgress(prev => ({ ...prev, current: data.current, completed: data.completed, failed: data.failed }));
                } else if (data.type === 'item_complete') {
                  setResults(prev => [...prev, data.result]);
                  setProgress({ completed: data.completed, failed: data.failed, total: data.total, percent: data.percent, current: '' });
                } else if (data.type === 'complete') {
                  setProgress({ completed: data.completed, failed: data.failed, total: data.total, percent: 100, current: '' });
                } else if (data.type === 'error') {
                  setResults(prev => [...prev, { productNo: '-', productName: '시스템 오류', success: false, error: data.message }]);
                }
              } catch { }
            }
          }
        }
      }
    } catch (err: any) {
      setResults(prev => [...prev, { productNo: '-', productName: '네트워크 오류', success: false, error: err.message }]);
    }

    setState('done');
  }, [sendQueue]);

  // 대기열에서 제거
  const removeFromQueue = (productNo: string) => {
    setSendQueue(prev => prev.filter(q => q.originProductNo !== productNo));
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${state === 'sending' ? 'bg-amber-400 animate-pulse' : state === 'done' ? 'bg-blue-400' : 'bg-slate-600'}`} />
            <div>
              <h1 className="text-sm font-bold">네이버 스마트스토어 상품 송신</h1>
              <p className="text-[10px] text-slate-500 font-mono">PUT /v2/products/origin-products</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {state === 'sending' && <span className="text-xs font-mono text-slate-400">{formatTime(elapsedSeconds)}</span>}
            {state === 'ready' && (
              <button
                onClick={startSend}
                disabled={sendQueue.length === 0}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors active:scale-95 disabled:opacity-40"
              >
                송신 시작 ({sendQueue.length}개)
              </button>
            )}
            {state === 'done' && (
              <button onClick={() => window.close()} className="px-4 py-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg">
                닫기
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* 현황 카드 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase">전체 상품</p>
            <p className="text-lg font-black text-slate-300">{products.length}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-amber-900/50 p-3 text-center">
            <p className="text-[9px] text-amber-400 font-bold uppercase">송신 대상</p>
            <p className="text-lg font-black text-amber-400">{sendQueue.length}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-emerald-900/50 p-3 text-center">
            <p className="text-[9px] text-emerald-400 font-bold uppercase">성공</p>
            <p className="text-lg font-black text-emerald-400">{successResults.length}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-red-900/50 p-3 text-center">
            <p className="text-[9px] text-red-400 font-bold uppercase">실패</p>
            <p className="text-lg font-black text-red-400">{failedResults.length}</p>
          </div>
        </div>

        {/* 송신 모드 선택 */}
        {state === 'ready' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase">송신 모드</h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setSendMode('price');
                  // 할인 대상 상품 자동 큐 생성
                  const priceChanges = products.filter(p => p.lifecycle && p.lifecycle.discount > 0).map(p => ({
                    originProductNo: p.originProductNo,
                    discountRate: p.lifecycle!.discount
                  }));
                  setSendQueue(priceChanges);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${sendMode === 'price' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}
              >
                라이프사이클 가격 적용
              </button>
              <button
                onClick={() => {
                  setSendMode('status');
                  setSendQueue([]);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${sendMode === 'status' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}
              >
                상태 변경
              </button>
            </div>

            {/* 송신 대기열 미리보기 */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {sendQueue.length === 0 ? (
                <p className="text-center py-6 text-slate-600 text-xs">송신할 상품이 없습니다</p>
              ) : (
                sendQueue.map(item => {
                  const prod = products.find(p => p.originProductNo === item.originProductNo);
                  if (!prod) return null;
                  return (
                    <div key={item.originProductNo} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 group">
                      <div className="flex items-center gap-3 min-w-0">
                        {prod.thumbnailUrl && (
                          <img src={prod.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-300 truncate font-bold">{prod.name}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-500 font-mono">#{item.originProductNo}</span>
                            {item.discountRate !== undefined && (
                              <span className="text-amber-400">
                                <span className="font-bold">즉시할인 적용: {item.discountRate}%</span>
                              </span>
                            )}
                            {item.salePrice !== undefined && (
                              <span className="text-amber-400">
                                {prod.salePrice.toLocaleString()}원 → <span className="font-bold">{item.salePrice.toLocaleString()}원</span>
                              </span>
                            )}
                            {item.statusType && (
                              <span className="text-blue-400">{prod.statusType} → {item.statusType}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromQueue(item.originProductNo)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 송신 진행률 */}
        {(state === 'sending' || state === 'done') && (
          <div className="bg-slate-900 rounded-xl border border-amber-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {state === 'sending' && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                <span className="text-xs font-bold text-amber-300">
                  {state === 'sending' ? '송신 진행 중' : '송신 완료'}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-400">{progress.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{progress.completed + progress.failed} / {progress.total}개</span>
              {progress.current && <span className="text-amber-400">#{progress.current} 처리 중...</span>}
            </div>
          </div>
        )}

        {/* 결과: 성공 + 실패 2컬럼 */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 성공 */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">성공</span>
                <span className="text-[10px] text-slate-500 font-mono">{successResults.length}건</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {successResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-600 text-xs">성공 건 없음</div>
                ) : (
                  successResults.map((r, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[10px] text-slate-500 font-mono">#{r.productNo}</span>
                        <span className="text-[11px] text-slate-300 truncate font-bold">{r.productName}</span>
                      </div>
                      {r.changes && r.changes.length > 0 && (
                        <div className="ml-5 space-y-0.5">
                          {r.changes.map((c, j) => (
                            <p key={j} className="text-[10px] text-emerald-400/70">{c}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 실패 */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-red-400">실패 상세</span>
                <span className="text-[10px] text-slate-500 font-mono">{failedResults.length}건</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {failedResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-600 text-xs">실패 건 없음</div>
                ) : (
                  failedResults.map((r, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-[10px] text-slate-500 font-mono">#{r.productNo}</span>
                        <span className="text-[11px] text-slate-300 truncate font-bold">{r.productName}</span>
                      </div>
                      <div className="ml-5 bg-red-950/50 border border-red-900/30 rounded-md px-2.5 py-1.5">
                        <p className="text-[10px] text-red-400 font-mono leading-relaxed break-all">{r.error}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 완료 요약 */}
        {state === 'done' && (
          <div className="bg-gradient-to-r from-amber-950/50 to-slate-900 rounded-xl border border-amber-800/30 p-5 text-center">
            <p className="text-lg font-black text-amber-300 mb-1">송신 완료</p>
            <p className="text-xs text-slate-400 mb-4">{formatTime(elapsedSeconds)} 소요</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="bg-emerald-950/50 rounded-lg p-3 border border-emerald-800/30">
                <p className="text-2xl font-black text-emerald-400">{successResults.length}</p>
                <p className="text-[10px] text-emerald-500 font-bold">성공</p>
              </div>
              <div className="bg-red-950/50 rounded-lg p-3 border border-red-800/30">
                <p className="text-2xl font-black text-red-400">{failedResults.length}</p>
                <p className="text-[10px] text-red-500 font-bold">실패</p>
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => { loadProducts(); setState('loading'); setResults([]); setElapsedSeconds(0); }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                다시 송신
              </button>
              <button onClick={() => window.close()} className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                창 닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
