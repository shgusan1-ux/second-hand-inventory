'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface Product {
    originProductNo: string;
    channelProductNo?: number;
    name: string;
    salePrice?: number;
    representativeImage?: { url: string };
    channelProductDisplayCategoryNoList?: string[];
    internalCategory?: string;
    [key: string]: any;
}

interface FittingModel {
    id: string;
    type: string;
    name: string;
    image_url: string;
    is_default: boolean;
}

interface FittingProgress {
    current: number;
    total: number;
    message: string;
    results: Array<{ productNo: string; resultUrl: string; naverSynced: boolean }>;
}

interface VirtualFittingTabProps {
    products: Product[];
    onRefresh: () => void;
}

function extractGender(name: string): 'MAN' | 'WOMAN' | 'KIDS' {
    const match = name.match(/(MAN|WOMAN|KIDS|UNISEX)-\S+$/);
    if (match) {
        if (match[1] === 'UNISEX') return 'MAN';
        return match[1] as 'MAN' | 'WOMAN' | 'KIDS';
    }
    return 'MAN';
}

const MAX_FITTING_SELECT = 30; // 한 번에 최대 선택 가능 수

export function VirtualFittingTab({ products, onRefresh }: VirtualFittingTabProps) {
    // 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [models, setModels] = useState<FittingModel[]>([]);
    const [fittingResults, setFittingResults] = useState<Map<string, string>>(new Map());
    const [isProcessing] = useState(false); // 새창에서 처리되므로 여기선 읽기 전용
    const [logs, setLogs] = useState<string[]>([]);
    const [modelChoice, setModelChoice] = useState<'flash' | 'pro'>('flash');
    const [syncToNaver, setSyncToNaver] = useState(false);
    const [showModelManager, setShowModelManager] = useState(false);
    const [modelUploadType, setModelUploadType] = useState<'MAN' | 'WOMAN' | 'KIDS'>('MAN');
    const [modelUploadName, setModelUploadName] = useState('');
    const [genderFilter, setGenderFilter] = useState<'ALL' | 'MAN' | 'WOMAN' | 'KIDS'>('ALL');
    const [unfittedOnly, setUnfittedOnly] = useState(false);
    const [enlargedModelUrl, setEnlargedModelUrl] = useState<string | null>(null); // 모델 이미지 크게보기
    const [sortByAI, setSortByAI] = useState(false);
    const [aiRanking, setAiRanking] = useState<Map<string, { score: number; reasons: string[] }>>(new Map());
    const [showBulkSearch, setShowBulkSearch] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkCodes, setBulkCodes] = useState<Set<string>>(new Set());
    const logRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 로그 추가
    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString('ko-KR');
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    // 로그 자동 스크롤
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    // 모델 목록 로드
    useEffect(() => {
        fetch('/api/smartstore/virtual-fitting/models')
            .then(r => r.json())
            .then(data => {
                if (data.models) setModels(data.models);
            })
            .catch(e => console.error('모델 로드 실패:', e));
    }, []);

    // 피팅 결과 로드 (DB에서 완료된 상품번호 목록)
    useEffect(() => {
        fetch('/api/smartstore/virtual-fitting/results')
            .then(r => r.json())
            .then(data => {
                if (data.results) {
                    const map = new Map<string, string>();
                    data.results.forEach((r: { product_no: string; result_image_url: string }) => {
                        map.set(r.product_no, r.result_image_url);
                    });
                    setFittingResults(map);
                }
            })
            .catch(e => console.error('피팅 결과 로드 실패:', e));
    }, []);

    // 필터된 상품
    const filtered = useMemo(() => {
        let result = bulkCodes.size > 0
            ? products.filter(p => bulkCodes.has(p.originProductNo))
            : products.filter(p => {
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return p.name.toLowerCase().includes(term) || p.originProductNo.includes(term);
                }
                return true;
            });

        if (genderFilter !== 'ALL') {
            result = result.filter(p => extractGender(p.name) === genderFilter);
        }

        if (unfittedOnly) {
            result = result.filter(p => !fittingResults.has(p.originProductNo));
        }

        if (sortByAI && aiRanking.size > 0) {
            result.sort((a, b) => {
                const aScore = aiRanking.get(a.originProductNo)?.score || 0;
                const bScore = aiRanking.get(b.originProductNo)?.score || 0;
                return bScore - aScore;
            });
        }

        return result;
    }, [products, searchTerm, genderFilter, unfittedOnly, fittingResults, sortByAI, aiRanking, bulkCodes]);

    // 성별별 통계
    const genderStats = useMemo(() => {
        const stats = { MAN: 0, WOMAN: 0, KIDS: 0 };
        products.forEach(p => {
            const g = extractGender(p.name);
            stats[g]++;
        });
        return stats;
    }, [products]);

    // 모델 업로드
    const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const name = modelUploadName || `${modelUploadType} 모델`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', modelUploadType);
        formData.append('name', name);
        formData.append('isDefault', 'true');

        addLog(`모델 업로드: ${name} (${modelUploadType})...`);

        try {
            const res = await fetch('/api/smartstore/virtual-fitting/models', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setModels(prev => [...prev, data.model]);
                addLog(`모델 등록 완료: ${name}`);
                setModelUploadName('');
            } else {
                addLog(`모델 등록 실패: ${data.error}`);
            }
        } catch (err: any) {
            addLog(`모델 업로드 오류: ${err.message}`);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 모델 삭제
    const handleModelDelete = async (id: string) => {
        try {
            await fetch(`/api/smartstore/virtual-fitting/models/${id}`, { method: 'DELETE' });
            setModels(prev => prev.filter(m => m.id !== id));
            addLog('모델 삭제 완료');
        } catch (err: any) {
            addLog(`모델 삭제 실패: ${err.message}`);
        }
    };

    // 선택 토글
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (next.size >= MAX_FITTING_SELECT) {
                    alert(`한 번에 최대 ${MAX_FITTING_SELECT}개까지 선택 가능합니다.\n현재 ${next.size}개 선택됨`);
                    return prev;
                }
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length || selectedIds.size >= MAX_FITTING_SELECT) {
            setSelectedIds(new Set());
        } else {
            const toSelect = filtered.slice(0, MAX_FITTING_SELECT).map(p => p.originProductNo);
            if (filtered.length > MAX_FITTING_SELECT) {
                alert(`전체 ${filtered.length}개 중 최대 ${MAX_FITTING_SELECT}개만 선택됩니다.`);
            }
            setSelectedIds(new Set(toSelect));
        }
    };

    // AI 추천 정렬
    const handleAIRecommend = async () => {
        addLog('AI 추천 순위 계산 중...');
        try {
            const res = await fetch('/api/smartstore/virtual-fitting/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: filtered }),
            });
            const data = await res.json();
            if (data.ranked) {
                const map = new Map<string, { score: number; reasons: string[] }>();
                data.ranked.forEach((r: any) => map.set(r.originProductNo, { score: r.score, reasons: r.reasons }));
                setAiRanking(map);
                setSortByAI(true);
                addLog(`AI 추천 완료: ${data.ranked.length}개 상품 순위 매김`);
            }
        } catch (err: any) {
            addLog(`AI 추천 실패: ${err.message}`);
        }
    };

    // 가상피팅 실행 - 새창에서 진행
    const handleGenerate = () => {
        const selected = filtered.filter(p => selectedIds.has(p.originProductNo));
        if (selected.length === 0) {
            alert('선택된 상품이 없습니다');
            return;
        }

        if (models.length === 0) {
            alert('등록된 모델이 없습니다. 먼저 모델을 등록해주세요.');
            setShowModelManager(true);
            return;
        }

        // sessionStorage로 데이터 전달 (URL 길이 제한 회피)
        const ids = selected.map(p => p.originProductNo).join(',');
        sessionStorage.setItem('fitting-editor-ids', ids);
        sessionStorage.setItem('fitting-editor-model', modelChoice);
        sessionStorage.setItem('fitting-editor-sync', syncToNaver ? 'true' : 'false');

        window.open('/smartstore/fitting-editor', '_blank', 'width=1400,height=900');
        addLog(`새 창에서 피팅 에디터 열림: ${selected.length}개 상품`);
    };

    const modelsByType = (type: string) => models.filter(m => m.type === type);

    return (
        <div className="w-full space-y-4">
            {/* 모델 관리 섹션 */}
            <div className="bg-white rounded-xl border">
                <button
                    onClick={() => setShowModelManager(!showModelManager)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">모델 관리</span>
                        <span className="text-xs text-slate-500">
                            MAN: {modelsByType('MAN').length} | WOMAN: {modelsByType('WOMAN').length} | KIDS: {modelsByType('KIDS').length}
                        </span>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${showModelManager ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showModelManager && (
                    <div className="p-4 pt-0 border-t space-y-4">
                        {/* 모델 업로드 */}
                        <div className="flex gap-3 items-end">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">성별</label>
                                <select
                                    value={modelUploadType}
                                    onChange={e => setModelUploadType(e.target.value as any)}
                                    className="px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="MAN">남성 (MAN)</option>
                                    <option value="WOMAN">여성 (WOMAN)</option>
                                    <option value="KIDS">아동 (KIDS)</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-slate-500 block mb-1">모델 이름</label>
                                <input
                                    type="text"
                                    value={modelUploadName}
                                    onChange={e => setModelUploadName(e.target.value)}
                                    placeholder="예: 남성 모델 A"
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleModelUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                    사진 업로드
                                </button>
                            </div>
                        </div>

                        {/* 등록된 모델 그리드 */}
                        <div className="grid grid-cols-3 gap-4">
                            {['MAN', 'WOMAN', 'KIDS'].map(type => (
                                <div key={type} className="space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-600">
                                        {type === 'MAN' ? '남성' : type === 'WOMAN' ? '여성' : '아동'} 모델
                                    </h4>
                                    {modelsByType(type).length === 0 ? (
                                        <div className="aspect-[3/4] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm border-2 border-dashed">
                                            미등록
                                        </div>
                                    ) : (
                                        modelsByType(type).map(m => (
                                            <div key={m.id} className="relative group">
                                                <img
                                                    src={m.image_url}
                                                    alt={m.name}
                                                    className="w-full aspect-[3/4] object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => setEnlargedModelUrl(m.image_url)}
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1.5 rounded-b-lg flex justify-between items-center">
                                                    <span>{m.name}{m.is_default ? ' (기본)' : ''}</span>
                                                    <button
                                                        onClick={() => handleModelDelete(m.id)}
                                                        className="text-red-300 hover:text-red-100"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 통계 & 액션바 */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-white rounded-xl border p-3">
                    <p className="text-xs text-slate-500">전체 상품</p>
                    <p className="text-xl font-bold">{products.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-3">
                    <p className="text-xs text-slate-500">남성</p>
                    <p className="text-xl font-bold text-blue-600">{genderStats.MAN}</p>
                </div>
                <div className="bg-white rounded-xl border p-3">
                    <p className="text-xs text-slate-500">여성</p>
                    <p className="text-xl font-bold text-pink-600">{genderStats.WOMAN}</p>
                </div>
                <div className="bg-white rounded-xl border p-3">
                    <p className="text-xs text-slate-500">아동</p>
                    <p className="text-xl font-bold text-amber-600">{genderStats.KIDS}</p>
                </div>
                <div className="bg-white rounded-xl border p-3">
                    <p className="text-xs text-slate-500">피팅 완료</p>
                    <p className="text-xl font-bold text-emerald-600">{fittingResults.size}</p>
                </div>
                <div className="bg-white rounded-xl border p-3">
                    <p className="text-xs text-slate-500">선택됨</p>
                    <p className="text-xl font-bold text-violet-600">{selectedIds.size}</p>
                </div>
            </div>

            {/* 필터 & 액션 */}
            <div className="flex flex-wrap gap-2 items-center">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="상품 검색..."
                    disabled={bulkCodes.size > 0}
                    className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
                {bulkCodes.size > 0 ? (
                    <button
                        onClick={() => { setBulkCodes(new Set()); setBulkText(''); }}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                    >
                        대량검색 해제 ({bulkCodes.size})
                    </button>
                ) : (
                    <button
                        onClick={() => setShowBulkSearch(true)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                    >
                        대량검색
                    </button>
                )}
                <div className="flex gap-1">
                    {(['ALL', 'MAN', 'WOMAN', 'KIDS'] as const).map(g => (
                        <button
                            key={g}
                            onClick={() => setGenderFilter(g)}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${genderFilter === g ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {g === 'ALL' ? '성별 전체' : g}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setUnfittedOnly(!unfittedOnly)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${unfittedOnly ? 'bg-orange-500 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
                >
                    미완료만 {unfittedOnly && `(${filtered.length})`}
                </button>
                <button
                    onClick={handleAIRecommend}
                    disabled={isProcessing}
                    className="px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                    AI 추천순
                </button>
                <button
                    onClick={toggleSelectAll}
                    className="px-3 py-2 bg-white border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                    {selectedIds.size > 0 ? '전체 해제' : `전체 선택 (최대${MAX_FITTING_SELECT})`}
                </button>
            </div>

            {/* 실행 옵션 */}
            {selectedIds.size > 0 && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex flex-wrap items-center gap-4 animate-in slide-in-from-top duration-200">
                    <span className="font-medium text-violet-800">{selectedIds.size}개 선택</span>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-violet-700">모델:</label>
                        <select
                            value={modelChoice}
                            onChange={e => setModelChoice(e.target.value as 'flash' | 'pro')}
                            className="px-2 py-1 border rounded text-xs"
                        >
                            <option value="flash">Flash (빠름, 저렴)</option>
                            <option value="pro">Pro (고품질)</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-violet-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={syncToNaver}
                            onChange={e => setSyncToNaver(e.target.checked)}
                            className="rounded border-violet-300"
                        />
                        네이버 자동 동기화
                    </label>
                    <button
                        onClick={handleGenerate}
                        disabled={isProcessing}
                        className="ml-auto px-6 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                        {isProcessing ? '처리 중...' : '가상피팅 생성'}
                    </button>
                </div>
            )}

            {/* 진행률은 새창 에디터에서 표시 */}

            {/* 상품 그리드 */}
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {filtered.map(product => {
                    const isSelected = selectedIds.has(product.originProductNo);
                    const gender = extractGender(product.name);
                    const resultUrl = fittingResults.get(product.originProductNo);
                    const ranking = aiRanking.get(product.originProductNo);

                    return (
                        <div
                            key={product.originProductNo}
                            className={`bg-white rounded-xl border overflow-hidden transition-all cursor-pointer group relative hover:shadow-md ${isSelected ? 'ring-2 ring-violet-500' : ''
                                }`}
                            onClick={() => toggleSelect(product.originProductNo)}
                        >
                            <div className="aspect-square bg-slate-100 relative">
                                {/* 체크박스 */}
                                <div className="absolute top-2 left-2 z-20" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(product.originProductNo)}
                                        className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer shadow-sm"
                                    />
                                </div>

                                {/* 성별 뱃지 */}
                                <div className={`absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded text-[10px] font-bold ${gender === 'MAN' ? 'bg-blue-500 text-white' :
                                    gender === 'WOMAN' ? 'bg-pink-500 text-white' :
                                        'bg-amber-500 text-white'
                                    }`}>
                                    {gender}
                                </div>

                                {/* Vision 등급 뱃지 */}
                                {product.classification?.visionGrade && (
                                    <div className="absolute top-2 left-10 z-20 px-1.5 py-0.5 rounded bg-slate-800/90 text-white text-[10px] font-black border border-white/20">
                                        {product.classification.visionGrade}
                                    </div>
                                )}

                                {/* 피팅 완료 뱃지 */}
                                {resultUrl && (
                                    <div className="absolute bottom-2 left-2 z-20 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">
                                        피팅완료
                                    </div>
                                )}

                                {/* AI 추천 점수 */}
                                {ranking && (
                                    <div className="absolute bottom-2 right-2 z-20 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold">
                                        {ranking.score}점
                                    </div>
                                )}

                                {/* 이미지 - 피팅 결과 있으면 결과, 없으면 원본 */}
                                <img
                                    src={resultUrl || product.representativeImage?.url || ''}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onClick={(e) => {
                                        if (resultUrl) {
                                            e.stopPropagation();
                                            sessionStorage.setItem('fitting-editor-ids', product.originProductNo);
                                            sessionStorage.setItem('fitting-editor-model', modelChoice);
                                            sessionStorage.setItem('fitting-editor-sync', 'false');
                                            window.open('/smartstore/fitting-editor', '_blank', 'width=1400,height=900');
                                        }
                                    }}
                                />
                            </div>
                            <div className="p-2">
                                <p
                                    className="text-xs font-medium text-slate-700 truncate hover:text-blue-600 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (product.channelProductNo) {
                                            window.open(`https://smartstore.naver.com/brownstreet/products/${product.channelProductNo}`, '_blank');
                                        }
                                    }}
                                    title={product.channelProductNo ? '네이버 상품 페이지 열기' : product.name}
                                >{product.name}</p>
                                <div className="flex items-center justify-between">
                                    <span
                                        className="text-[10px] text-slate-400 hover:text-blue-600 hover:underline cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (product.channelProductNo) {
                                                window.open(`https://smartstore.naver.com/brownstreet/products/${product.channelProductNo}`, '_blank');
                                            }
                                        }}
                                    >
                                        {product.salePrice?.toLocaleString()}원
                                    </span>
                                    {ranking && (
                                        <span className="text-[9px] text-violet-500">{ranking.reasons[0]}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Before/After는 새창 에디터에서 확인 */}

            {/* 프로세스 로그 */}
            {logs.length > 0 && (
                <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-xs max-h-60 overflow-y-auto" ref={logRef}>
                    <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                        <span className="font-bold">Process Logs</span>
                        <button
                            onClick={() => setLogs([])}
                            className="text-slate-400 hover:text-white text-xs"
                        >
                            Clear
                        </button>
                    </div>
                    {logs.map((log, i) => (
                        <div key={i} className="leading-5">{log}</div>
                    ))}
                </div>
            )}

            {/* 모델 이미지 크게보기 모달 */}
            {enlargedModelUrl && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-pointer"
                    onClick={() => setEnlargedModelUrl(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]">
                        <img
                            src={enlargedModelUrl}
                            alt="모델 이미지"
                            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                        />
                        <button
                            onClick={() => setEnlargedModelUrl(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-lg shadow-lg hover:bg-slate-200"
                        >
                            X
                        </button>
                    </div>
                </div>
            )}

            {/* 대량검색 모달 */}
            {showBulkSearch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setShowBulkSearch(false)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-slate-800">상품코드 대량 검색</h2>
                            <button onClick={() => setShowBulkSearch(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">상품코드를 붙여넣기 하세요. (줄바꿈, 쉼표, 공백, 탭으로 구분)</p>
                        <textarea
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            placeholder={"82945286614\n82945286615\n82945286616\n..."}
                            rows={10}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                            autoFocus
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                                {bulkText.trim() ? `${bulkText.trim().split(/[\n,\s\t]+/).filter(Boolean).length}개 코드 감지` : '코드를 입력하세요'}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBulkSearch(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        const codes = bulkText.trim().split(/[\n,\s\t]+/).map(c => c.trim()).filter(Boolean);
                                        if (codes.length === 0) { alert('상품코드를 입력하세요'); return; }
                                        setBulkCodes(new Set(codes));
                                        setSearchTerm('');
                                        setShowBulkSearch(false);
                                        addLog(`[대량검색] ${codes.length}개 상품코드로 필터링`);
                                    }}
                                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700"
                                >
                                    검색 적용
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
