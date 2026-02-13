'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getNaverRealTimeCounts } from '@/lib/actions';

interface Product {
  originProductNo: string;
  name: string;
  salePrice?: number;
  stockQuantity?: number;
  statusType?: string;
  regDate?: string;
  lifecycle?: { stage: string; daysSince: number };
  archiveInfo?: { category: string };
  internalCategory?: string;
  naverCategoryId?: string;
}

interface CategoryManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

// 다이어그램 기준 ARCHIVE 하위 카테고리 (ETC 제거)
const ARCHIVE_SUB_CATEGORIES = [
  { id: 'MILITARY ARCHIVE', name: 'MILITARY', description: 'M-65, MA-1, 필드자켓, 카고팬츠, Alpha Industries, Rothco', color: 'bg-emerald-700' },
  { id: 'WORKWEAR ARCHIVE', name: 'WORKWEAR', description: '칼하트, 디키즈, 데님, 캔버스, 초어자켓, Pointer', color: 'bg-amber-600' },
  { id: 'OUTDOOR ARCHIVE', name: 'OUTDOOR', description: '파타고니아, 노스페이스(빈티지), ACG, 아크테릭스', color: 'bg-teal-600' },
  { id: 'JAPANESE ARCHIVE', name: 'JAPANESE ARCHIVE', description: '빔즈, 포터, 캐피탈, Visvim, 일본 데님', color: 'bg-red-500' },
  { id: 'HERITAGE EUROPE', name: 'HERITAGE EUROPE', description: '프랑스/독일 빈티지, 몰스킨, Le Laboureur', color: 'bg-blue-500' },
  { id: 'BRITISH ARCHIVE', name: 'BRITISH ARCHIVE', description: '바버, 버버리, 아쿠아스큐텀, 트렌치/트위드', color: 'bg-indigo-500' },
];

// CLEARANCE 하위 카테고리 (판매유지/폐기결정)
const CLEARANCE_SUB_CATEGORIES = [
  { id: 'CLEARANCE_KEEP', name: '판매유지', description: '할인 적용 후 계속 판매 유지', color: 'bg-amber-500' },
  { id: 'CLEARANCE_DISPOSE', name: '폐기결정', description: '판매 중단 및 폐기 처리 대상', color: 'bg-red-600' },
];

// 내부 카테고리 (라이프사이클 스테이지)
const LIFECYCLE_STAGES = [
  { id: 'NEW', name: 'NEW', description: '신규 등록 상품', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'CURATED', name: 'CURATED', description: '큐레이션 완료 상품', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  { id: 'ARCHIVE', name: 'ARCHIVE', description: '아카이브 분류 상품', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-500' },
  { id: 'CLEARANCE', name: 'CLEARANCE', description: '할인/정리 상품', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
];

export function CategoryManagementTab({ products, onRefresh }: CategoryManagementTabProps) {
  const [section, setSection] = useState<'internal' | 'naver'>('internal');
  const [archiveExpanded, setArchiveExpanded] = useState(true);
  const [clearanceExpanded, setClearanceExpanded] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedArchiveSub, setSelectedArchiveSub] = useState<string | null>(null);
  const [selectedClearanceSub, setSelectedClearanceSub] = useState<string | null>(null);
  const [naverSearch, setNaverSearch] = useState('');
  const [naverCategories, setNaverCategories] = useState<any[]>([]);
  const [naverLoading, setNaverLoading] = useState(false);
  const [naverLoaded, setNaverLoaded] = useState(false);
  const [naverCounts, setNaverCounts] = useState<Record<string, number> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 스테이지별 카운트
  const stageCounts = useMemo(() => {
    if (naverCounts) return { ...naverCounts, NONE: 0 }; // Use synced counts if available
    const counts: Record<string, number> = { NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0, NONE: 0 };
    for (const p of products) {
      const stage = p.lifecycle?.stage || 'NONE';
      if (counts[stage] !== undefined) counts[stage]++;
      else counts['NONE']++;
    }
    return counts;
  }, [products, naverCounts]);

  // ARCHIVE 상품 하위 카테고리별 카운트
  const archiveSubCounts = useMemo(() => {
    const archiveProducts = products.filter(p => p.lifecycle?.stage === 'ARCHIVE');
    const counts: Record<string, number> = {};
    for (const cat of ARCHIVE_SUB_CATEGORIES) counts[cat.id] = 0;
    counts['UNCATEGORIZED'] = 0;
    for (const p of archiveProducts) {
      const cat = p.internalCategory || p.archiveInfo?.category || 'UNCATEGORIZED';
      const found = ARCHIVE_SUB_CATEGORIES.find(c => c.id === cat);
      if (found) counts[found.id]++;
      else counts['UNCATEGORIZED']++;
    }
    return counts;
  }, [products]);

  // CLEARANCE 상품 하위 카테고리별 카운트
  const clearanceSubCounts = useMemo(() => {
    const clearanceProducts = products.filter(p => p.lifecycle?.stage === 'CLEARANCE');
    const counts: Record<string, number> = {};
    for (const cat of CLEARANCE_SUB_CATEGORIES) counts[cat.id] = 0;
    counts['CLEARANCE_UNASSIGNED'] = 0;
    for (const p of clearanceProducts) {
      const cat = p.internalCategory || 'CLEARANCE';
      const found = CLEARANCE_SUB_CATEGORIES.find(c => c.id === cat);
      if (found) counts[found.id]++;
      else counts['CLEARANCE_UNASSIGNED']++;
    }
    return counts;
  }, [products]);

  // 선택된 스테이지/카테고리 상품 목록
  const selectedProducts = useMemo(() => {
    if (selectedArchiveSub) {
      return products.filter(p => {
        if (p.lifecycle?.stage !== 'ARCHIVE') return false;
        if (selectedArchiveSub === 'UNCATEGORIZED') {
          const cat = p.internalCategory || p.archiveInfo?.category || 'UNCATEGORIZED';
          return !ARCHIVE_SUB_CATEGORIES.find(c => c.id === cat);
        }
        const cat = p.internalCategory || p.archiveInfo?.category;
        return cat === selectedArchiveSub;
      });
    }
    if (selectedClearanceSub) {
      return products.filter(p => {
        if (p.lifecycle?.stage !== 'CLEARANCE') return false;
        if (selectedClearanceSub === 'CLEARANCE_UNASSIGNED') {
          const cat = p.internalCategory || 'CLEARANCE';
          return !CLEARANCE_SUB_CATEGORIES.find(c => c.id === cat);
        }
        return p.internalCategory === selectedClearanceSub;
      });
    }
    if (selectedStage) {
      return products.filter(p => p.lifecycle?.stage === selectedStage);
    }
    return [];
  }, [products, selectedStage, selectedArchiveSub, selectedClearanceSub]);

  // 네이버 카테고리 로드
  const loadNaverCategories = async () => {
    if (naverLoaded) return;
    setNaverLoading(true);
    try {
      const res = await fetch('/api/smartstore/categories');
      const data = await res.json();
      if (data.success && data.data) {
        setNaverCategories(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.error('네이버 카테고리 로드 실패:', e);
    }
    setNaverLoading(false);
    setNaverLoaded(true);
  };

  // 네이버 카테고리별 상품 수
  const naverCategoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.naverCategoryId) {
        counts[p.naverCategoryId] = (counts[p.naverCategoryId] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  // 네이버 카테고리 필터링 및 정렬
  const filteredNaverCategories = useMemo(() => {
    let result = naverCategories;

    // 검색 필터
    if (naverSearch.trim()) {
      const term = naverSearch.toLowerCase();
      result = result.filter((c: any) => {
        const name = (c.name || c.wholeCategoryName || '').toLowerCase();
        const id = String(c.id || c.categoryId || '');
        return name.includes(term) || id.includes(term);
      });
    }

    // 정렬 (상품 수 내림차순)
    return [...result]
      .sort((a: any, b: any) => {
        const countA = naverCategoryProductCounts[a.id || a.categoryId] || 0;
        const countB = naverCategoryProductCounts[b.id || b.categoryId] || 0;
        return countB - countA;
      })
      .slice(0, 100);
  }, [naverCategories, naverSearch, naverCategoryProductCounts]);

  const handleStageClick = (stageId: string) => {
    setSelectedArchiveSub(null);
    setSelectedClearanceSub(null);
    setSelectedStage(selectedStage === stageId ? null : stageId);
  };

  const handleArchiveSubClick = (subId: string) => {
    setSelectedStage(null);
    setSelectedClearanceSub(null);
    setSelectedArchiveSub(selectedArchiveSub === subId ? null : subId);
  };

  const handleClearanceSubClick = (subId: string) => {
    setSelectedStage(null);
    setSelectedArchiveSub(null);
    setSelectedClearanceSub(selectedClearanceSub === subId ? null : subId);
  };

  const handleSyncCounts = async () => {
    setIsSyncing(true);
    try {
      const res = await getNaverRealTimeCounts();
      if (res.success && res.counts) {
        setNaverCounts(res.counts);
        toast.success('네이버 실제 수량과 동기화되었습니다.');
      } else {
        toast.error('동기화 실패: ' + (res.error || '알 수 없는 오류'));
      }
    } catch (e) {
      toast.error('동기화 중 오류가 발생했습니다.');
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-4">
      {/* 섹션 토글 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSection('internal')}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${section === 'internal' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          내부카테고리
        </button>
        <button
          onClick={() => {
            setSection('naver');
            loadNaverCategories();
          }}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${section === 'naver' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          외부 네이버 카테고리
        </button>
      </div>

      {section === 'internal' ? (
        <div className="space-y-3">
          {/* 전체 통계 */}
          <div className="bg-white rounded-xl border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">라이프사이클 현황</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{products.length}개 전체</span>
                <button
                  onClick={handleSyncCounts}
                  disabled={isSyncing}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                  title="네이버 실시간 수량 동기화"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {LIFECYCLE_STAGES.map(stage => (
                <div key={stage.id} className="text-center">
                  <p className={`text-lg font-bold ${stage.color}`}>{stageCounts[stage.id]}</p>
                  <p className="text-[10px] font-bold text-slate-400">{stage.id}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 내부 카테고리 트리 */}
          <div className="bg-white rounded-xl border divide-y divide-slate-100">
            {LIFECYCLE_STAGES.map(stage => {
              const hasSubCategories = stage.id === 'ARCHIVE' || stage.id === 'CLEARANCE';
              const isExpanded = stage.id === 'ARCHIVE' ? archiveExpanded : stage.id === 'CLEARANCE' ? clearanceExpanded : false;

              return (
                <div key={stage.id}>
                  {/* 스테이지 행 */}
                  <button
                    onClick={() => {
                      if (stage.id === 'ARCHIVE') {
                        setArchiveExpanded(!archiveExpanded);
                      } else if (stage.id === 'CLEARANCE') {
                        setClearanceExpanded(!clearanceExpanded);
                      } else {
                        handleStageClick(stage.id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 ${selectedStage === stage.id ? stage.bg + ' border-l-4' : ''
                      }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dot} shrink-0`} />
                    <span className="text-sm font-bold text-slate-800 flex-1">{stage.name}</span>
                    <span className={`text-sm font-bold ${stage.color}`}>{stageCounts[stage.id]}</span>
                    {hasSubCategories ? (
                      isExpanded
                        ? <ChevronDown className="w-4 h-4 text-slate-400" />
                        : <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  {/* ARCHIVE 하위 카테고리 */}
                  {stage.id === 'ARCHIVE' && archiveExpanded && (
                    <div className="bg-slate-50/50">
                      {ARCHIVE_SUB_CATEGORIES.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => handleArchiveSubClick(sub.id)}
                          className={`w-full flex items-center gap-3 pl-10 pr-4 py-2.5 text-left transition-colors hover:bg-slate-100 active:bg-slate-200 ${selectedArchiveSub === sub.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-sm ${sub.color} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-700">{sub.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 hidden md:inline">{sub.description}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{archiveSubCounts[sub.id]}</span>
                        </button>
                      ))}
                      {/* 미분류 */}
                      {archiveSubCounts['UNCATEGORIZED'] > 0 && (
                        <button
                          onClick={() => handleArchiveSubClick('UNCATEGORIZED')}
                          className={`w-full flex items-center gap-3 pl-10 pr-4 py-2.5 text-left transition-colors hover:bg-slate-100 ${selectedArchiveSub === 'UNCATEGORIZED' ? 'bg-amber-50 border-l-4 border-amber-500' : ''
                            }`}
                        >
                          <span className="w-2 h-2 rounded-sm bg-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-amber-700 flex-1">미분류</span>
                          <span className="text-xs font-bold text-amber-600">{archiveSubCounts['UNCATEGORIZED']}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* CLEARANCE 하위 카테고리 */}
                  {stage.id === 'CLEARANCE' && clearanceExpanded && (
                    <div className="bg-amber-50/30">
                      {CLEARANCE_SUB_CATEGORIES.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => handleClearanceSubClick(sub.id)}
                          className={`w-full flex items-center gap-3 pl-10 pr-4 py-2.5 text-left transition-colors hover:bg-amber-100/50 active:bg-amber-100 ${selectedClearanceSub === sub.id ? 'bg-amber-100 border-l-4 border-amber-500' : ''
                            }`}
                        >
                          <span className={`w-2 h-2 rounded-sm ${sub.color} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-700">{sub.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 hidden md:inline">{sub.description}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{clearanceSubCounts[sub.id]}</span>
                        </button>
                      ))}
                      {/* 미배정 */}
                      {clearanceSubCounts['CLEARANCE_UNASSIGNED'] > 0 && (
                        <button
                          onClick={() => handleClearanceSubClick('CLEARANCE_UNASSIGNED')}
                          className={`w-full flex items-center gap-3 pl-10 pr-4 py-2.5 text-left transition-colors hover:bg-amber-100/50 ${selectedClearanceSub === 'CLEARANCE_UNASSIGNED' ? 'bg-amber-100 border-l-4 border-amber-500' : ''
                            }`}
                        >
                          <span className="w-2 h-2 rounded-sm bg-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-500 flex-1">미배정</span>
                          <span className="text-xs font-bold text-slate-400">{clearanceSubCounts['CLEARANCE_UNASSIGNED']}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {naverCounts && (
            <p className="text-[10px] text-center text-slate-400 mt-2">
              * 수량은 네이버 스마트스토어 실시간 데이터입니다. (NEW는 전체에서 나머지를 뺀 추정치)
            </p>
          )}

          {/* 선택된 카테고리 상품 목록 */}
          {(selectedStage || selectedArchiveSub || selectedClearanceSub) && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm">
                  {selectedArchiveSub
                    ? selectedArchiveSub === 'UNCATEGORIZED'
                      ? 'ARCHIVE > 미분류'
                      : `ARCHIVE > ${ARCHIVE_SUB_CATEGORIES.find(c => c.id === selectedArchiveSub)?.name || selectedArchiveSub}`
                    : selectedClearanceSub
                      ? selectedClearanceSub === 'CLEARANCE_UNASSIGNED'
                        ? 'CLEARANCE > 미배정'
                        : `CLEARANCE > ${CLEARANCE_SUB_CATEGORIES.find(c => c.id === selectedClearanceSub)?.name || selectedClearanceSub}`
                      : selectedStage}
                  <span className="text-slate-400 font-normal ml-2">({selectedProducts.length}개)</span>
                </h3>
                <button
                  onClick={() => { setSelectedStage(null); setSelectedArchiveSub(null); setSelectedClearanceSub(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  닫기
                </button>
              </div>

              {selectedProducts.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">해당 카테고리에 상품이 없습니다.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedProducts.slice(0, 50).map(p => (
                    <div key={p.originProductNo} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">#{p.originProductNo}</span>
                          {p.regDate && (
                            <span className="text-[9px] text-slate-400">{new Date(p.regDate).toLocaleDateString('ko-KR')}</span>
                          )}
                          {p.salePrice && (
                            <span className="text-[10px] font-bold text-blue-600">{p.salePrice.toLocaleString()}원</span>
                          )}
                          {p.stockQuantity !== undefined && (
                            <span className={`text-[10px] font-bold ${p.stockQuantity === 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              재고 {p.stockQuantity}
                            </span>
                          )}
                        </div>
                      </div>
                      {p.internalCategory && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0 ml-2">
                          {p.internalCategory}
                        </span>
                      )}
                    </div>
                  ))}
                  {selectedProducts.length > 50 && (
                    <p className="text-center text-xs text-slate-400 py-2">
                      상위 50개만 표시 (전체 {selectedProducts.length}개)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 네이버 카테고리 브라우저 */
        <div className="space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="카테고리명 또는 ID로 검색..."
              value={naverSearch}
              onChange={e => setNaverSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {naverLoading ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-500">네이버 카테고리 로딩 중...</p>
            </div>
          ) : naverCategories.length === 0 && naverLoaded ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <p className="text-sm text-slate-500 mb-2">카테고리를 불러오지 못했습니다.</p>
              <button
                onClick={() => { setNaverLoaded(false); loadNaverCategories(); }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border divide-y divide-slate-100">
              <div className="px-4 py-2.5 bg-slate-50 rounded-t-xl">
                <span className="text-xs font-bold text-slate-500">
                  {naverSearch ? `검색 결과: ${filteredNaverCategories.length}개` : `전체 ${naverCategories.length}개 (상위 100개 표시)`}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {filteredNaverCategories.map((cat: any, idx: number) => (
                  <div key={cat.id || cat.categoryId || idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 truncate">
                        {cat.wholeCategoryName || cat.name || '이름 없음'}
                      </p>
                      {naverCategoryProductCounts[cat.id || cat.categoryId] > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 ml-2">
                          ({naverCategoryProductCounts[cat.id || cat.categoryId]}개)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                      {cat.id || cat.categoryId}
                    </span>
                  </div>
                ))}
                {filteredNaverCategories.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
