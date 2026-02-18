'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface ProductData {
    originProductNo: string;
    name: string;
    salePrice: number;
    representativeImage?: { url: string };
    thumbnailUrl?: string;
    internalCategory?: string;
    descriptionGrade?: string;
    classification?: { visionGrade?: string };
}

interface FittingResult {
    productNo: string;
    resultUrl: string;
    naverSynced: boolean;
    gender: string;
    modelName: string;
    savedToTemp: boolean;
    variationIndex: number; // 현재 코디 번호
}

interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'progress';
}

export default function FittingEditorPage() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const modelChoice = (searchParams.get('model') || 'flash') as 'flash' | 'pro';
    const syncToNaver = searchParams.get('sync') === 'true';

    const [products, setProducts] = useState<ProductData[]>([]);
    const [results, setResults] = useState<Map<string, FittingResult>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProductNo, setProcessingProductNo] = useState<string | null>(null);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(0);
    const [phase, setPhase] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [autoStarted, setAutoStarted] = useState(false);
    const logRef = useRef<HTMLDivElement>(null);

    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('ko-KR');
        setLogs(prev => [...prev, { time, message, type }]);
    };

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    // 상품 데이터 로드
    useEffect(() => {
        if (!idsParam) return;
        const ids = idsParam.split(',').filter(Boolean);
        setTotal(ids.length);

        fetch('/api/smartstore/products?cacheOnly=true')
            .then(r => r.json())
            .then(data => {
                if (data.success && data.data?.contents) {
                    const map = new Map<string, any>();
                    data.data.contents.forEach((p: any) => map.set(String(p.originProductNo), p));
                    const found = ids.map(id => map.get(id)).filter(Boolean);
                    setProducts(found);
                    addLog(`${found.length}개 상품 정보 로드 완료`);
                }
            })
            .catch(e => addLog(`상품 정보 로드 실패: ${e.message}`, 'error'));
    }, [idsParam]);

    // 자동 시작
    useEffect(() => {
        if (products.length > 0 && !autoStarted && !isProcessing) {
            setAutoStarted(true);
            startFitting();
        }
    }, [products]);

    // SSE 스트림 처리 공용 함수
    const processStream = async (
        res: Response,
        onResult?: (event: any) => void
    ) => {
        const reader = res.body?.getReader();
        if (!reader) throw new Error('스트림을 읽을 수 없습니다');

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
                        addLog(event.message);
                    } else if (event.type === 'progress') {
                        setCurrent(event.current || 0);
                        setPhase(event.phase || '');
                        addLog(event.message, 'progress');
                    } else if (event.type === 'result') {
                        setCurrent(event.current);
                        setResults(prev => {
                            const next = new Map(prev);
                            const existing = next.get(event.productNo);
                            next.set(event.productNo, {
                                productNo: event.productNo,
                                resultUrl: event.resultUrl,
                                naverSynced: event.naverSynced,
                                gender: event.gender,
                                modelName: event.modelName,
                                savedToTemp: false,
                                variationIndex: existing ? existing.variationIndex + 1 : 0,
                            });
                            return next;
                        });
                        addLog(`${event.productNo} 완료${event.naverSynced ? ' (네이버 동기화)' : ''}`, 'success');
                        if (onResult) onResult(event);
                    } else if (event.type === 'error') {
                        addLog(event.reason || event.message, 'error');
                    } else if (event.type === 'complete') {
                        addLog(event.message, 'success');
                        toast.success(event.message);
                    }
                } catch { /* JSON parse error */ }
            }
        }
    };

    // 배치 피팅 실행
    const startFitting = async (variationSeed?: number) => {
        if (isProcessing || products.length === 0) return;
        setIsProcessing(true);
        setCurrent(0);
        addLog(`가상피팅 시작: ${products.length}개 상품 (${modelChoice === 'pro' ? 'HD' : 'Standard'} 품질)${syncToNaver ? ' + 네이버 동기화' : ''}`);

        try {
            const payload: any = {
                products: products.map(p => ({
                    originProductNo: p.originProductNo,
                    name: p.name,
                    imageUrl: p.representativeImage?.url || p.thumbnailUrl || '',
                    archiveCategory: p.internalCategory,
                })),
                modelChoice,
                syncToNaver,
            };
            if (variationSeed !== undefined) payload.variationSeed = variationSeed;

            const res = await fetch('/api/smartstore/virtual-fitting/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            await processStream(res);
        } catch (err: any) {
            addLog(`피팅 실패: ${err.message}`, 'error');
            toast.error(`피팅 실패: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProcessingProductNo(null);
        }
    };

    // 개별 재생성 (다른 코디)
    const regenerateWithNewStyle = async (product: ProductData) => {
        const existing = results.get(product.originProductNo);
        const nextVariation = existing ? existing.variationIndex + 1 : Math.floor(Math.random() * 4);

        addLog(`${product.originProductNo} 다른 코디로 재생성 (스타일 #${nextVariation + 1})...`);
        setIsProcessing(true);
        setProcessingProductNo(product.originProductNo);

        try {
            const payload = {
                products: [{
                    originProductNo: product.originProductNo,
                    name: product.name,
                    imageUrl: product.representativeImage?.url || product.thumbnailUrl || '',
                    archiveCategory: product.internalCategory,
                }],
                modelChoice,
                syncToNaver: false,
                variationSeed: nextVariation,
            };

            const res = await fetch('/api/smartstore/virtual-fitting/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            await processStream(res, () => {
                toast.success('다른 코디로 재생성 완료!');
            });
        } catch (err: any) {
            addLog(`재생성 실패: ${err.message}`, 'error');
        } finally {
            setIsProcessing(false);
            setProcessingProductNo(null);
        }
    };

    // 임시 저장
    const saveTempResult = async (product: ProductData) => {
        const result = results.get(product.originProductNo);
        if (!result) return;

        addLog(`${product.originProductNo} 임시 저장 중...`);

        try {
            const res = await fetch('/api/smartstore/virtual-fitting/temp-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productNo: product.originProductNo,
                    resultUrl: result.resultUrl,
                    productName: product.name,
                    archiveCategory: product.internalCategory,
                }),
            });

            if (res.ok) {
                setResults(prev => {
                    const next = new Map(prev);
                    const existing = next.get(product.originProductNo);
                    if (existing) next.set(product.originProductNo, { ...existing, savedToTemp: true });
                    return next;
                });
                addLog(`${product.originProductNo} 임시 저장 완료`, 'success');
                toast.success('임시 저장 완료! 나중에 검토할 수 있습니다.');
            } else {
                const data = await res.json();
                addLog(`임시 저장 실패: ${data.error || res.statusText}`, 'error');
            }
        } catch (err: any) {
            addLog(`임시 저장 오류: ${err.message}`, 'error');
        }
    };

    // 네이버 동기화
    const syncSingleToNaver = async (product: ProductData) => {
        const result = results.get(product.originProductNo);
        if (!result) return;

        addLog(`${product.originProductNo} 네이버 동기화 시작...`);

        try {
            const res = await fetch('/api/smartstore/products/update-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originProductNo: product.originProductNo,
                    imageUrl: result.resultUrl,
                }),
            });

            if (res.ok) {
                setResults(prev => {
                    const next = new Map(prev);
                    const existing = next.get(product.originProductNo);
                    if (existing) next.set(product.originProductNo, { ...existing, naverSynced: true });
                    return next;
                });
                addLog(`${product.originProductNo} 네이버 동기화 완료`, 'success');
                toast.success('네이버 동기화 완료');
            } else {
                const data = await res.json();
                addLog(`네이버 동기화 실패: ${data.error || res.statusText}`, 'error');
            }
        } catch (err: any) {
            addLog(`네이버 동기화 오류: ${err.message}`, 'error');
        }
    };

    const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
    const successCount = results.size;
    const selectedP = selectedProduct ? products.find(p => p.originProductNo === selectedProduct) : null;
    const selectedResult = selectedProduct ? results.get(selectedProduct) : null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            <Toaster position="top-right" theme="dark" />

            {/* Header */}
            <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-3">
                            <span className="bg-violet-600 px-3 py-1 rounded-lg text-sm">FITTING</span>
                            가상피팅 에디터
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {total}개 상품 | {modelChoice === 'pro' ? 'HD' : 'Standard'} 품질
                            {syncToNaver && ' | 네이버 동기화'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isProcessing && results.size < products.length && products.length > 0 && (
                            <button
                                onClick={() => startFitting()}
                                className="px-6 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all"
                            >
                                {results.size > 0 ? '재시작' : '피팅 시작'}
                            </button>
                        )}
                        <button
                            onClick={() => window.close()}
                            className="px-4 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 border border-white/10"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Progress Bar */}
                {(isProcessing || current > 0) && (
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 mb-6 backdrop-blur-xl">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400 font-medium">
                                {isProcessing ? phase || '처리 중...' : '완료'}
                            </span>
                            <span className="text-white font-bold">{progressPercent}% ({current}/{total})</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${isProcessing
                                    ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                                    : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                    }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex gap-4 mt-3 text-xs text-slate-400">
                            <span>성공: <strong className="text-emerald-400">{successCount}</strong></span>
                            <span>실패: <strong className="text-red-400">{Math.max(0, current - successCount)}</strong></span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-12 gap-6">
                    {/* Left: Product List */}
                    <div className="col-span-4 space-y-3">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">
                            상품 목록 ({products.length})
                        </h2>
                        <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                            {products.map(product => {
                                const result = results.get(product.originProductNo);
                                const isSelected = selectedProduct === product.originProductNo;
                                const isThisProcessing = processingProductNo === product.originProductNo;

                                return (
                                    <div
                                        key={product.originProductNo}
                                        onClick={() => setSelectedProduct(product.originProductNo)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                            ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                            : 'bg-slate-900/50 border-white/5 hover:bg-slate-800/50 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 relative">
                                            <img
                                                src={result?.resultUrl || product.representativeImage?.url || product.thumbnailUrl || ''}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            {isThisProcessing && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white font-medium truncate">{product.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {product.originProductNo} | {product.salePrice?.toLocaleString()}원
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                            {result ? (
                                                <>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${result.naverSynced
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-violet-500/20 text-violet-400'
                                                        }`}>
                                                        {result.naverSynced ? '동기화됨' : '완료'}
                                                    </span>
                                                    {result.savedToTemp && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                                                            임시저장
                                                        </span>
                                                    )}
                                                </>
                                            ) : isProcessing ? (
                                                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">
                                                    대기
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Preview & Actions */}
                    <div className="col-span-8 space-y-4">
                        {selectedP ? (
                            <>
                                {/* Before / After 비교 */}
                                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{selectedP.name}</h3>
                                            {selectedResult && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    코디 스타일 #{selectedResult.variationIndex + 1}
                                                    {selectedP.internalCategory && ` | ${selectedP.internalCategory}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {/* 임시 저장 */}
                                            {selectedResult && !selectedResult.savedToTemp && (
                                                <button
                                                    onClick={() => saveTempResult(selectedP)}
                                                    disabled={isProcessing}
                                                    className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                                >
                                                    임시 저장
                                                </button>
                                            )}
                                            {selectedResult?.savedToTemp && (
                                                <span className="px-4 py-2 bg-amber-600/20 text-amber-400 text-sm font-medium rounded-lg">
                                                    저장됨
                                                </span>
                                            )}
                                            {/* 네이버 동기화 */}
                                            {selectedResult && !selectedResult.naverSynced && (
                                                <button
                                                    onClick={() => syncSingleToNaver(selectedP)}
                                                    disabled={isProcessing}
                                                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                >
                                                    네이버 동기화
                                                </button>
                                            )}
                                            {/* 다른 코디로 다시하기 */}
                                            <button
                                                onClick={() => regenerateWithNewStyle(selectedP)}
                                                disabled={isProcessing}
                                                className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                                            >
                                                {processingProductNo === selectedP.originProductNo ? (
                                                    <>
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        생성 중...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        다른 코디로 다시하기
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-2 text-center font-medium uppercase tracking-wider">원본 이미지</p>
                                            <div className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-white/5">
                                                <img
                                                    src={selectedP.representativeImage?.url || selectedP.thumbnailUrl || ''}
                                                    alt="Original"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-2 text-center font-medium uppercase tracking-wider">
                                                가상피팅 결과
                                                {selectedResult?.naverSynced && (
                                                    <span className="ml-2 text-emerald-400">(네이버 동기화됨)</span>
                                                )}
                                            </p>
                                            <div className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center relative">
                                                {selectedResult ? (
                                                    <>
                                                        <img
                                                            src={selectedResult.resultUrl}
                                                            alt="Fitting Result"
                                                            className="w-full h-full object-contain"
                                                        />
                                                        {/* 등급뱃지 오버레이 */}
                                                        {(selectedP.descriptionGrade || selectedP.classification?.visionGrade) && (
                                                            <img
                                                                src={`/images/grades/${(selectedP.descriptionGrade || selectedP.classification?.visionGrade || 'b').toLowerCase()}grade.png`}
                                                                alt="Grade Badge"
                                                                className="absolute top-3 right-3 w-[18%] opacity-50"
                                                            />
                                                        )}
                                                    </>
                                                ) : processingProductNo === selectedP.originProductNo ? (
                                                    <div className="text-center">
                                                        <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                                        <p className="text-slate-400 text-sm">생성 중...</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-600 text-sm text-center">
                                                        <div className="text-3xl mb-2">?</div>
                                                        <p>피팅 결과 대기 중</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 상품 정보 */}
                                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                                        <span>상품번호: <strong className="text-slate-300">{selectedP.originProductNo}</strong></span>
                                        <span>가격: <strong className="text-slate-300">{selectedP.salePrice?.toLocaleString()}원</strong></span>
                                        {selectedP.internalCategory && (
                                            <span>카테고리: <strong className="text-slate-300">{selectedP.internalCategory}</strong></span>
                                        )}
                                        {selectedResult?.gender && (
                                            <span>성별: <strong className="text-slate-300">{selectedResult.gender}</strong></span>
                                        )}
                                        {(selectedP.descriptionGrade || selectedP.classification?.visionGrade) && (
                                            <span>등급: <strong className="text-slate-300">{selectedP.descriptionGrade || selectedP.classification?.visionGrade}</strong></span>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-12 text-center">
                                <div className="text-4xl text-slate-700 mb-3">?</div>
                                <p className="text-slate-500">좌측 목록에서 상품을 선택하세요</p>
                            </div>
                        )}

                        {/* Process Logs */}
                        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Process Logs</span>
                                <button
                                    onClick={() => setLogs([])}
                                    className="text-xs text-slate-500 hover:text-white transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                            <div
                                ref={logRef}
                                className="max-h-48 overflow-y-auto p-4 font-mono text-xs space-y-1"
                            >
                                {logs.length === 0 && (
                                    <p className="text-slate-600">로그가 여기에 표시됩니다...</p>
                                )}
                                {logs.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`leading-5 ${log.type === 'success' ? 'text-emerald-400' :
                                            log.type === 'error' ? 'text-red-400' :
                                                log.type === 'progress' ? 'text-violet-400' :
                                                    'text-slate-400'
                                            }`}
                                    >
                                        <span className="text-slate-600">[{log.time}]</span> {log.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
