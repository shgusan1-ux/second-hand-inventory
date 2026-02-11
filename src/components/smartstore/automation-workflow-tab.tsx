'use client';

import { useState, useMemo, useEffect } from 'react';
import { StatDetailModal } from './stat-detail-modal';

interface Classification {
  brand: string;
  brandTier: string;
  gender: string;
  size: string;
  clothingType: string;
  clothingSubType: string;
  confidence: number;
  suggestedNaverCategory?: string;
}

interface Product {
  originProductNo: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  thumbnailUrl?: string | null;
  lifecycle?: { stage: string; daysSince: number };
  internalCategory?: string;
  classification?: Classification & { visionStatus?: string; visionGrade?: string };
}

interface AutomationWorkflowTabProps {
  products: Product[];
  onRefresh: () => void;
}

interface LogEntry {
  productNo: string;
  productName: string;
  timestamp: string;
  result: Classification;
}

interface CustomBrand {
  id: number;
  brand_name: string;
  brand_name_ko: string;
  aliases: string[];
  tier: string;
  country: string;
  notes: string;
}

export function AutomationWorkflowTab({ products, onRefresh }: AutomationWorkflowTabProps) {
  const [showLog, setShowLog] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // Vision 배치 상태
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; failed: number; total: number; percent: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (batchRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [batchRunning]);

  // 진행 상태에 따른 메시지 생성
  const getProgressMessage = () => {
    if (!batchProgress) return '대기 중...';
    if (batchProgress.percent === 100) return '분석 완료!';

    // 단순화된 작업 메시지 로직
    const currentItemIndex = batchProgress.completed + batchProgress.failed + 1;
    const isAnalyzing = batchProgress.percent < 90;

    if (isAnalyzing) {
      return `상품 #${currentItemIndex} 정밀 분석 중... (패턴, 재질, 오염도)`;
    } else {
      return '데이터베이스 동기화 및 저장 중...';
    }
  };

  // 브랜드 관리 상태
  const [showBrands, setShowBrands] = useState(false);
  const [brands, setBrands] = useState<CustomBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [newBrand, setNewBrand] = useState({ brand_name: '', brand_name_ko: '', tier: 'MILITARY', aliases: '' });

  // 대량 등록 및 리스트 필터 상태
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkTier, setBulkTier] = useState('MILITARY');
  const [bulkText, setBulkText] = useState('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [listFilterTier, setListFilterTier] = useState<string | 'ALL'>('ALL');

  const filteredBrands = useMemo(() => {
    return brands.filter(b => {
      const matchesSearch = !brandSearch ||
        b.brand_name.toLowerCase().includes(brandSearch.toLowerCase()) ||
        (b.brand_name_ko && b.brand_name_ko.includes(brandSearch));
      const matchesTier = listFilterTier === 'ALL' || b.tier === listFilterTier;
      return matchesSearch && matchesTier;
    });
  }, [brands, brandSearch, listFilterTier]);

  // 분류 통계 산출
  const stats = useMemo(() => {
    const classified = products.filter(p => p.classification);
    const total = products.length;
    const classifiedCount = classified.length;

    const avgConfidence = classifiedCount > 0
      ? Math.round(classified.reduce((sum, p) => sum + (p.classification?.confidence || 0), 0) / classifiedCount)
      : 0;

    const byClothingType: Record<string, number> = {};
    classified.forEach(p => {
      const ct = p.classification!.clothingType;
      byClothingType[ct] = (byClothingType[ct] || 0) + 1;
    });

    const byBrandTier: Record<string, number> = {};
    classified.forEach(p => {
      const bt = p.classification!.brandTier;
      byBrandTier[bt] = (byBrandTier[bt] || 0) + 1;
    });

    const byGender: Record<string, number> = {};
    classified.forEach(p => {
      const g = p.classification!.gender;
      byGender[g] = (byGender[g] || 0) + 1;
    });

    const highConf = classified.filter(p => p.classification!.confidence >= 70).length;
    const midConf = classified.filter(p => p.classification!.confidence >= 40 && p.classification!.confidence < 70).length;
    const lowConf = classified.filter(p => p.classification!.confidence < 40).length;

    const brandCounts: Record<string, number> = {};
    classified.forEach(p => {
      const b = p.classification!.brand;
      if (b) brandCounts[b] = (brandCounts[b] || 0) + 1;
    });
    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total, classifiedCount, avgConfidence,
      byClothingType, byBrandTier, byGender,
      highConf, midConf, lowConf,
      topBrands
    };
  }, [products]);

  // Vision 배치 시작
  const startVisionBatch = async (limit: number = 20) => {
    const eligible = products.filter(p => p.thumbnailUrl && (!p.classification?.visionStatus || p.classification.visionStatus === 'none'));
    if (eligible.length === 0) {
      import('sonner').then(({ toast }) => toast.info('분석할 상품이 없습니다'));
      return;
    }

    const batch = eligible.slice(0, limit).map(p => ({
      originProductNo: p.originProductNo,
      name: p.name,
      imageUrl: p.thumbnailUrl!
    }));

    setBatchRunning(true);
    setElapsedSeconds(0);
    setBatchProgress({ completed: 0, failed: 0, total: batch.length, percent: 0 });

    try {
      const res = await fetch('/api/smartstore/vision/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: batch, concurrency: 2, limit })
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
                  setBatchProgress({ completed: data.completed, failed: data.failed, total: data.total, percent: data.percent });
                } else if (data.type === 'complete') {
                  setBatchProgress({ completed: data.completed, failed: data.failed, total: data.total, percent: 100 });
                  import('sonner').then(({ toast }) => toast.success(`Vision 분석 완료: ${data.completed}개 성공, ${data.failed}개 실패`));
                }
              } catch { }
            }
          }
        }
      }
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error('배치 분석 실패: ' + err.message));
    } finally {
      setBatchRunning(false);
    }
  };

  // 브랜드 로드
  const loadBrands = async () => {
    setBrandsLoading(true);
    try {
      const res = await fetch('/api/smartstore/brands');
      const data = await res.json();
      setBrands(data.brands || []);
    } catch { } finally {
      setBrandsLoading(false);
    }
  };

  // 브랜드 단일 추가
  const addBrand = async () => {
    if (!newBrand.brand_name) return;
    try {
      const res = await fetch('/api/smartstore/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBrand,
          aliases: newBrand.aliases ? newBrand.aliases.split(',').map(a => a.trim()) : []
        })
      });
      const data = await res.json();
      if (data.success) {
        import('sonner').then(({ toast }) => toast.success(`${newBrand.brand_name} 추가 완료`));
        setNewBrand({ brand_name: '', brand_name_ko: '', tier: 'MILITARY', aliases: '' });
        loadBrands();
      } else {
        import('sonner').then(({ toast }) => toast.error(data.error));
      }
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error(err.message));
    }
  };

  // 브랜드 대량 추가 (엑셀 파싱 지원형)
  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setIsBulkLoading(true);
    try {
      const lines = bulkText.trim().split('\n');
      const brandList = lines.map(line => {
        const parts = line.split('\t').length > 1 ? line.split('\t') : line.split('|');
        const [brand_name, brand_name_ko] = parts.map(p => p?.trim());
        return {
          brand_name: brand_name || '',
          brand_name_ko: brand_name_ko || '',
          tier: bulkTier,
          aliases: []
        };
      }).filter(b => b.brand_name);

      if (brandList.length === 0) {
        import('sonner').then(({ toast }) => toast.error('파싱된 데이터가 없습니다.'));
        return;
      }

      const res = await fetch('/api/smartstore/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandList)
      });
      const data = await res.json();

      if (data.success) {
        import('sonner').then(({ toast }) => toast.success(`${tierLabel[bulkTier]} 브랜드 ${brandList.length}개 등록 완료`));
        setBulkText('');
        loadBrands();
      } else {
        import('sonner').then(({ toast }) => toast.error(data.error));
      }
    } catch (err) {
      import('sonner').then(({ toast }) => toast.error('등록 중 오류 발생'));
    } finally {
      setIsBulkLoading(false);
    }
  };

  // 브랜드 삭제
  const deleteBrand = async (id: number, name: string) => {
    if (!confirm(`${name} 브랜드를 삭제하시겠습니까?`)) return;
    try {
      await fetch(`/api/smartstore/brands/${id}`, { method: 'DELETE' });
      loadBrands();
    } catch { }
  };

  // 교차검증 로그 로드
  const loadLog = async () => {
    setLogLoading(true);
    try {
      const res = await fetch('/api/smartstore/classify/stats');
      const data = await res.json();
      if (data.recentEntries && data.recentEntries.length > 0) {
        // API는 평면 구조 반환 → LogEntry 형식으로 변환
        const mapped: LogEntry[] = data.recentEntries.map((e: any) => ({
          productNo: e.productNo || '',
          productName: e.name || e.productName || '',
          timestamp: e.timestamp || new Date().toISOString(),
          result: {
            brand: e.brand || '',
            brandTier: e.brandTier || 'OTHER',
            gender: e.gender || 'UNKNOWN',
            size: e.size || '',
            clothingType: e.clothingType || 'UNKNOWN',
            clothingSubType: e.clothingSubType || '',
            confidence: e.confidence || 0,
            suggestedNaverCategory: e.suggestedNaverCategory,
          }
        }));
        setLogEntries(mapped);
      } else {
        // API에 데이터 없으면 로컬 products에서 생성
        const entries = products
          .filter(p => p.classification)
          .slice(0, 50)
          .map(p => ({
            productNo: p.originProductNo,
            productName: p.name,
            timestamp: new Date().toISOString(),
            result: p.classification!
          }));
        setLogEntries(entries);
      }
    } catch {
      const entries = products
        .filter(p => p.classification)
        .slice(0, 50)
        .map(p => ({
          productNo: p.originProductNo,
          productName: p.name,
          timestamp: new Date().toISOString(),
          result: p.classification!
        }));
      setLogEntries(entries);
    } finally {
      setLogLoading(false);
    }
  };

  const clothingTypeLabel: Record<string, string> = {
    OUTERWEAR: '아우터',
    TOPS: '상의',
    BOTTOMS: '하의',
    DRESS: '원피스',
    OTHER: '기타',
    UNKNOWN: '미분류'
  };

  const tierLabel: Record<string, string> = {
    MILITARY: 'MILITARY ARCHIVE',
    WORKWEAR: 'WORKWEAR ARCHIVE',
    OUTDOOR: 'OUTDOOR ARCHIVE',
    JAPAN: 'JAPAN ARCHIVE',
    HERITAGE: 'HERITAGE ARCHIVE',
    BRITISH: 'BRITISH ARCHIVE'
  };

  const tierColor: Record<string, string> = {
    MILITARY: 'bg-emerald-700',
    WORKWEAR: 'bg-amber-600',
    OUTDOOR: 'bg-teal-600',
    JAPAN: 'bg-red-500',
    HERITAGE: 'bg-blue-500',
    BRITISH: 'bg-indigo-500'
  };

  // 카테고리 저장 (일괄 적용)
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [statDetailType, setStatDetailType] = useState<'HIGH_CONFIDENCE' | 'LOW_CONFIDENCE' | null>(null);

  const handleSaveCategory = async (tierKey: string) => {
    const targetCategory = tierLabel[tierKey]; // e.g., "MILITARY ARCHIVE"
    // AI 분류가 해당 tier이면서, 실제 카테고리는 아직 적용되지 않은 상품들
    const targetProducts = products.filter(p =>
      p.classification?.brandTier === tierKey &&
      p.internalCategory !== targetCategory
    );

    if (targetProducts.length === 0) {
      import('sonner').then(({ toast }) => toast.info('저장할 새로운 상품이 없습니다.'));
      return;
    }

    if (!confirm(`${targetCategory}로 분류된 ${targetProducts.length}개 상품을 해당 카테고리로 확정하시겠습니까?`)) return;

    setSavingTier(tierKey);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productNos: targetProducts.map(p => p.originProductNo),
          category: targetCategory
        })
      });

      if (res.ok) {
        import('sonner').then(({ toast }) => toast.success(`${targetProducts.length}개 상품 저장 완료`));
        onRefresh();
      } else {
        throw new Error('저장 실패');
      }
    } catch (err) {
      import('sonner').then(({ toast }) => toast.error('카테고리 저장 중 오류가 발생했습니다.'));
    } finally {
      setSavingTier(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-sm">다차원 AI 분류 엔진</h3>
          </div>
          <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded">v2.0 ACTIVE</span>
        </div>
        <p className="text-xs text-white/60">
          브랜드 / 의류타입 / 성별 / 사이즈 / 네이버 카테고리를 실시간 분류합니다.
          전체 {stats.total.toLocaleString()}개 상품 중 {stats.classifiedCount.toLocaleString()}개 분류 완료.
        </p>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-[10px] text-slate-400 font-bold mb-1">분류율</p>
          <p className="text-xl font-black text-slate-900">
            {stats.total > 0 ? Math.round((stats.classifiedCount / stats.total) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-[10px] text-slate-400 font-bold mb-1">평균 신뢰도</p>
          <p className={`text-xl font-black ${stats.avgConfidence >= 70 ? 'text-emerald-600' : stats.avgConfidence >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {stats.avgConfidence}%
          </p>
        </div>
        <div
          onClick={() => setStatDetailType('HIGH_CONFIDENCE')}
          className="bg-white rounded-xl border p-3 text-center cursor-pointer hover:shadow-md transition-all active:scale-95 group"
        >
          <p className="text-[10px] text-slate-400 font-bold mb-1 group-hover:text-emerald-600 transition-colors">고신뢰</p>
          <p className="text-xl font-black text-emerald-600">{stats.highConf}</p>
        </div>
        <div
          onClick={() => setStatDetailType('LOW_CONFIDENCE')}
          className="bg-white rounded-xl border p-3 text-center cursor-pointer hover:shadow-md transition-all active:scale-95 group"
        >
          <p className="text-[10px] text-slate-400 font-bold mb-1 group-hover:text-red-500 transition-colors">저신뢰</p>
          <p className="text-xl font-black text-red-500">{stats.lowConf}</p>
        </div>
      </div>

      {/* 레이웃: 좌(분포 및 지표) / 우(AI 분석 및 브랜드 관리) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* 의류 타입 분포 */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">의류 타입 분포</h4>
            <div className="space-y-2">
              {Object.entries(stats.byClothingType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 w-14 shrink-0">{clothingTypeLabel[type] || type}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(8, (count / stats.classifiedCount) * 100)}%` }}
                      >
                        <span className="text-[9px] font-black text-white">{count}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold w-10 text-right">
                      {Math.round((count / stats.classifiedCount) * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 아카이브 카테고리 */}
            <div className="bg-white rounded-xl border p-4">
              <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">아카이브 분류</h4>
              <div className="space-y-1.5">
                {[
                  { key: 'MILITARY', label: 'MILITARY', color: 'bg-emerald-700' },
                  { key: 'WORKWEAR', label: 'WORKWEAR', color: 'bg-amber-600' },
                  { key: 'OUTDOOR', label: 'OUTDOOR', color: 'bg-teal-600' },
                  { key: 'JAPAN', label: 'JAPANESE', color: 'bg-red-500' },
                  { key: 'HERITAGE', label: 'HERITAGE', color: 'bg-blue-500' },
                  { key: 'BRITISH', label: 'BRITISH', color: 'bg-indigo-500' },
                ].map(cat => {
                  const totalCount = products.filter(p =>
                    p.classification?.brandTier === cat.key
                  ).length;

                  const pendingCount = products.filter(p =>
                    p.classification?.brandTier === cat.key &&
                    p.internalCategory !== tierLabel[cat.key]
                  ).length;

                  return (
                    <div key={cat.key} className="flex items-center justify-between group h-7">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                        <span className="text-[10px] font-bold text-slate-600">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                          <button
                            onClick={() => handleSaveCategory(cat.key)}
                            disabled={savingTier === cat.key}
                            className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded flex items-center gap-1 transition-colors animate-in fade-in zoom-in duration-200"
                          >
                            {savingTier === cat.key ? (
                              <svg className="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                            )}
                            저장 ({pendingCount})
                          </button>
                        )}
                        <span className="text-[11px] font-black text-slate-800 w-8 text-right">{totalCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 성별 분포 */}
            <div className="bg-white rounded-xl border p-4">
              <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">성별 분포</h4>
              <div className="space-y-2">
                {Object.entries(stats.byGender)
                  .sort((a, b) => b[1] - a[1])
                  .map(([gender, count]) => (
                    <div key={gender} className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gender === 'MAN' ? 'bg-blue-100 text-blue-700' :
                        gender === 'WOMAN' ? 'bg-pink-100 text-pink-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {gender === 'MAN' ? '남성' : gender === 'WOMAN' ? '여성' : '미분류'}
                      </span>
                      <span className="text-[11px] font-black text-slate-800">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Vision 배치 분석 */}
          <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h4 className="text-sm font-bold text-violet-800">Gemini Vision 분석</h4>
              </div>
              <span className="text-[10px] text-violet-500 font-mono">gemini-3.0-pro</span>
            </div>

            {batchProgress && (
              <div className="mb-4 bg-white/50 rounded-lg p-3 border border-violet-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-violet-700 animate-pulse">
                      {batchRunning ? getProgressMessage() : '대기 중'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {batchProgress.completed + batchProgress.failed} / {batchProgress.total}개 완료
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-slate-700 block bg-slate-100 px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                      {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest scale-75 origin-right font-bold">Elapsed</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1 relative border border-slate-100">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${batchProgress.percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[9px] font-medium text-slate-500">
                  <span>진행률 {batchProgress.percent}%</span>
                  {batchProgress.failed > 0 && <span className="text-red-500 font-bold ml-auto">{batchProgress.failed}개 실패</span>}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => startVisionBatch(1)}
                disabled={batchRunning}
                className="py-1.5 px-3 text-[11px] font-bold text-violet-600 bg-white border border-violet-200 hover:bg-violet-50 rounded-lg disabled:opacity-50"
              >
                {batchRunning ? '...' : '1개'}
              </button>
              <button
                onClick={() => startVisionBatch(20)}
                disabled={batchRunning}
                className="flex-1 py-1.5 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
              >
                {batchRunning ? '분류 중...' : '20개 분석'}
              </button>
              <button
                onClick={() => startVisionBatch(100)}
                disabled={batchRunning}
                className="flex-1 py-1.5 text-[11px] font-bold text-violet-700 bg-white border border-violet-200 hover:bg-violet-50 rounded-lg disabled:opacity-50"
              >
                100개 분석
              </button>
            </div>
          </div>

          {/* 브랜드 수동 관리 (엑셀 방식 대량 등록 지원) */}
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <button
              onClick={() => {
                setShowBrands(!showBrands);
                if (!showBrands && brands.length === 0) loadBrands();
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-700 block">브랜드 마스터 관리</span>
                  <span className="text-[10px] text-slate-400 font-medium">({brands.length}개 브랜드 등록됨)</span>
                </div>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showBrands ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBrands && (
              <div className="border-t">
                {/* 등록 방식 전환 */}
                <div className="flex border-b bg-slate-50">
                  <button
                    onClick={() => setBulkMode(false)}
                    className={`flex-1 py-2 text-[10px] font-bold ${!bulkMode ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-slate-400'}`}
                  >
                    단일 등록
                  </button>
                  <button
                    onClick={() => setBulkMode(true)}
                    className={`flex-1 py-2 text-[10px] font-bold ${bulkMode ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-slate-400'}`}
                  >
                    대량 등록 (Excel)
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {!bulkMode ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="영문 이름"
                          value={newBrand.brand_name}
                          onChange={e => setNewBrand({ ...newBrand, brand_name: e.target.value })}
                          className="px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-amber-400 outline-none"
                        />
                        <input
                          placeholder="한글 이름"
                          value={newBrand.brand_name_ko}
                          onChange={e => setNewBrand({ ...newBrand, brand_name_ko: e.target.value })}
                          className="px-2 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-amber-400 outline-none"
                        />
                        <select
                          value={newBrand.tier}
                          onChange={e => setNewBrand({ ...newBrand, tier: e.target.value })}
                          className="col-span-2 px-2 py-1.5 text-[11px] border rounded-lg"
                        >
                          {Object.entries(tierLabel).map(([val, lab]) => (
                            <option key={val} value={val}>{lab}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={addBrand} className="w-full py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-shadow shadow-sm">
                        브랜드 추가
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* 엑셀 시트 방식 카테고리 선택 */}
                      <p className="text-[10px] font-bold text-slate-500 mb-1">카테고리 선택 (엑셀 시트 단위)</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(tierLabel).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setBulkTier(key)}
                            className={`px-2 py-1 text-[9px] font-bold rounded border transition-all ${bulkTier === key
                              ? `${tierColor[key]} text-white border-transparent`
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                              }`}
                          >
                            {label.includes(' ARCHIVE') ? label.replace(' ARCHIVE', '') : label}
                          </button>
                        ))}
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200">
                        <p className="text-[10px] text-slate-500 leading-tight">
                          엑셀에서 <span className="font-bold text-amber-700">영문이름, 한글이름</span> 두 열만 복사해서 아래에 붙여넣으세요.
                        </p>
                      </div>

                      <textarea
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder="예: RALPH LAUREN [탭] 랄프로렌"
                        className="w-full h-32 px-2 py-1.5 text-[11px] font-mono border rounded-lg focus:ring-1 focus:ring-amber-500 outline-none resize-none bg-slate-50/50"
                      />

                      <button
                        onClick={handleBulkAdd}
                        disabled={isBulkLoading || !bulkText.trim()}
                        className={`w-full py-2 text-xs font-bold text-white rounded-lg disabled:opacity-50 ${tierColor[bulkTier] || 'bg-slate-900'}`}
                      >
                        {isBulkLoading ? '처리 중...' : `[${tierLabel[bulkTier]}] 대량 등록 실행`}
                      </button>
                    </div>
                  )}

                  {/* 등록된 브랜드 목록 */}
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400">마스터 브랜드 DB ({filteredBrands.length} / {brands.length})</p>
                      <button
                        onClick={loadBrands}
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        동기화
                      </button>
                    </div>

                    {/* 검색 및 필터 */}
                    <div className="space-y-2">
                      <div className="relative">
                        <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="브랜드명 검색..."
                          value={brandSearch}
                          onChange={e => setBrandSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-[11px] border rounded-lg focus:ring-1 focus:ring-amber-500 outline-none bg-slate-50"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setListFilterTier('ALL')}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all ${listFilterTier === 'ALL' ? 'bg-slate-800 text-white border-transparent' : 'bg-white text-slate-400 border-slate-200'}`}
                        >
                          전체
                        </button>
                        {Object.keys(tierLabel).map(key => (
                          <button
                            key={key}
                            onClick={() => setListFilterTier(key)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all ${listFilterTier === key
                              ? `${tierColor[key]} text-white border-transparent`
                              : 'bg-white text-slate-400 border-slate-200'
                              }`}
                          >
                            {tierLabel[key].replace(' ARCHIVE', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto border rounded-xl divide-y divide-slate-50 bg-white">
                      {brandsLoading ? (
                        <p className="text-center py-10 text-slate-300 text-[10px] animate-pulse">데이터 로드 중...</p>
                      ) : filteredBrands.length === 0 ? (
                        <div className="py-10 text-center space-y-2 text-slate-400">
                          <p className="text-[11px]">결과가 없습니다.</p>
                          <button onClick={() => { setBrandSearch(''); setListFilterTier('ALL'); }} className="text-[10px] text-blue-500 underline">필터 초기화</button>
                        </div>
                      ) : filteredBrands.map(b => (
                        <div key={b.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50 group">
                          <div className="flex items-center gap-3">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tierColor[b.tier] || 'bg-slate-300'}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-800 text-[11px] leading-none uppercase tracking-tight">{b.brand_name}</span>
                                {b.brand_name_ko && <span className="text-slate-400 text-[10px] leading-none">({b.brand_name_ko})</span>}
                              </div>
                              <p className="text-[9px] text-slate-400 mt-1 font-mono uppercase">{tierLabel[b.tier]}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteBrand(b.id, b.brand_name)}
                            className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    {filteredBrands.length > 50 && (
                      <p className="text-center text-[9px] text-slate-400 italic">상위 50개 이상 검색됨. 검색어로 더 좁혀보세요.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 히스토리 로그 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <button
          onClick={() => {
            setShowLog(!showLog);
            if (!showLog && logEntries.length === 0) loadLog();
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">AI 분류 스트림</span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showLog ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showLog && (
          <div className="border-t max-h-80 overflow-y-auto bg-slate-50/30">
            {logLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">데이터를 스트리밍하는 중...</div>
            ) : logEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">최근 분류 활동이 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logEntries.map((entry, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-white transition-colors text-[10px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-slate-400 font-bold">#{entry.productNo}</span>
                      <span className="text-slate-300 font-medium">{new Date(entry.timestamp).toLocaleTimeString('ko-KR')}</span>
                    </div>
                    <p className="text-slate-700 font-black truncate mb-2">{entry.productName}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md font-black text-white ${tierColor[entry.result.brandTier] || 'bg-slate-400'}`}>
                        {entry.result.brand}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md font-black bg-blue-50 text-blue-600 border border-blue-100">
                        {entry.result.clothingType}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-md font-black border ${entry.result.gender === 'MAN' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                        entry.result.gender === 'WOMAN' ? 'bg-pink-50 text-pink-500 border-pink-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                        {entry.result.gender}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-md font-black border ${entry.result.confidence >= 70 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        entry.result.confidence >= 40 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-red-50 text-red-500 border-red-100'
                        }`}>
                        {entry.result.confidence}%
                      </span>
                      {/* 아카이브 분류 변경 */}
                      <select
                        value={entry.result.brandTier || 'OTHER'}
                        onChange={async (e) => {
                          const newTier = e.target.value;
                          // 로컬 상태 업데이트
                          setLogEntries(prev => prev.map((ent, idx) =>
                            idx === i ? { ...ent, result: { ...ent.result, brandTier: newTier } } : ent
                          ));
                          // DB 저장
                          try {
                            await fetch('/api/smartstore/vision/detail', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                originProductNo: entry.productNo,
                                productName: entry.productName,
                                brand: entry.result.brand,
                                clothingType: entry.result.clothingType,
                                clothingSubType: entry.result.clothingSubType || '',
                                gender: entry.result.gender,
                                grade: 'A급',
                                gradeReason: '',
                                pattern: '솔리드',
                                fabric: '',
                                size: entry.result.size || '',
                                colors: [],
                                confidence: entry.result.confidence,
                              }),
                            });
                            import('sonner').then(({ toast }) => toast.success(`${entry.productNo} → ${tierLabel[newTier] || newTier}`));
                          } catch {
                            import('sonner').then(({ toast }) => toast.error('저장 실패'));
                          }
                        }}
                        className={`ml-auto px-1 py-0.5 rounded text-[9px] font-bold border-0 outline-none cursor-pointer ${tierColor[entry.result.brandTier] || 'bg-slate-200'} text-white`}
                      >
                        {Object.entries(tierLabel).map(([key, label]) => (
                          <option key={key} value={key} className="text-slate-800 bg-white">{label.replace(' ARCHIVE', '')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {statDetailType && (
        <StatDetailModal
          type={statDetailType}
          products={products}
          onClose={() => setStatDetailType(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
