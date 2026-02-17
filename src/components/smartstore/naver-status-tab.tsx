'use client';

import { useState, useMemo, useRef } from 'react';
import { RefreshCw, Search, AlertTriangle, CheckCircle2, Info, Download, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  lifecycle?: { stage: string; daysSince: number; discountRate: number };
  internalCategory?: string;
  classification?: {
    brand: string;
    brandTier: string;
    gender: string;
    clothingType: string;
  };
  naverTag?: string | null;
  lastSyncedCategory?: string | null;
  lastSyncedAt?: string | null;
}

interface NaverStatusTabProps {
  products: Product[];
  onRefresh: () => void;
}

type FilterType = 'ALL' | 'MISMATCH' | 'UNSYNCED' | 'TAGGED' | 'UNTAGGED' | string;

const ARCHIVE_SUBS = [
  'MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE',
  'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE'
];

const TABLE_ROWS: { key: string; label: string; indent: boolean }[] = [
  { key: 'NEW', label: 'NEW', indent: false },
  { key: 'CURATED', label: 'CURATED', indent: false },
  { key: '_ARCHIVE_TOTAL', label: 'ARCHIVE', indent: false },
  { key: 'MILITARY ARCHIVE', label: 'Military', indent: true },
  { key: 'WORKWEAR ARCHIVE', label: 'Workwear', indent: true },
  { key: 'OUTDOOR ARCHIVE', label: 'Outdoor', indent: true },
  { key: 'JAPANESE ARCHIVE', label: 'Japan', indent: true },
  { key: 'HERITAGE EUROPE', label: 'Euro Vintage', indent: true },
  { key: 'BRITISH ARCHIVE', label: 'British', indent: true },
  { key: 'UNISEX ARCHIVE', label: 'Unisex', indent: true },
  { key: 'CLEARANCE', label: 'CLEARANCE', indent: false },
];

const CATEGORY_LABELS: Record<string, string> = {
  'NEW': 'NEW', 'CURATED': 'CURATED',
  'MILITARY ARCHIVE': 'Military', 'WORKWEAR ARCHIVE': 'Workwear',
  'OUTDOOR ARCHIVE': 'Outdoor', 'JAPANESE ARCHIVE': 'Japan',
  'HERITAGE EUROPE': 'Euro Vintage', 'BRITISH ARCHIVE': 'British',
  'UNISEX ARCHIVE': 'Unisex', 'ARCHIVE': 'Archive',
  'CLEARANCE': 'Clearance', 'CLEARANCE_KEEP': '판매유지',
  'CLEARANCE_DISPOSE': '폐기', 'NONE': '미배정',
};

const TAG_LABELS: Record<string, string> = {
  'BS뉴': 'NEW', 'BS큐레이티드': 'CURATED',
  'BS밀리터리': 'Military', 'BS워크웨어': 'Workwear',
  'BS아웃도어': 'Outdoor', 'BS재팬': 'Japan',
  'BS유로빈티지': 'Euro Vintage', 'BS브리티시': 'British',
  'BS유니섹스': 'Unisex', 'BS아카이브': 'Archive',
  'BS클리어런스': 'Clearance',
};

function getBaseStage(category: string): string {
  if (!category) return 'NONE';
  if (category === 'NEW') return 'NEW';
  if (category === 'CURATED') return 'CURATED';
  if (category.startsWith('CLEARANCE')) return 'CLEARANCE';
  if (category.includes('ARCHIVE') || category === 'HERITAGE EUROPE') return 'ARCHIVE';
  return 'NONE';
}

export function NaverStatusTab({ products, onRefresh }: NaverStatusTabProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [scanResult, setScanResult] = useState<{ counts: Record<string, number>; totalTime: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pageSize = 50;

  // 네이버에서 태그 & 전시카테고리 스캔 (불러오기)
  const startScan = async () => {
    if (!confirm(`${products.length}개 상품의 네이버 태그/전시카테고리를 스캔하시겠습니까?\n(5개씩 병렬 조회, 약 ${Math.ceil(products.length / 5 * 0.3)}초 소요)`)) return;

    setIsScanning(true);
    setScanProgress({ current: 0, total: products.length, message: '스캔 준비 중...' });
    setScanResult(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/smartstore/exhibition/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productNos: products.map(p => p.originProductNo),
          forceRescan: true,
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림 읽기 실패');

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
            if (data.type === 'progress') {
              setScanProgress({ current: data.current, total: data.total, message: data.message });
            } else if (data.type === 'complete') {
              setScanProgress({ current: data.total, total: data.total, message: data.message });
              setScanResult({ counts: data.counts || {}, totalTime: data.totalTime || '' });
            } else if (data.type === 'error') {
              alert(`스캔 오류: ${data.message}`);
            }
          } catch { }
        }
      }

      onRefresh();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        alert(`스캔 오류: ${e.message}`);
      }
    } finally {
      setIsScanning(false);
      abortRef.current = null;
    }
  };

  const stopScan = () => {
    abortRef.current?.abort();
    setIsScanning(false);
    setScanProgress(null);
  };

  // 데이터 분석: 시스템 분류 vs 네이버 전송 기록 vs 네이버 태그
  const { mergedProducts, syncedCounts, systemCounts, tagCounts, mismatchCount, unsyncedCount, syncedTotal, taggedTotal, untaggedTotal } = useMemo(() => {
    const synCounts: Record<string, number> = {};
    const sCounts: Record<string, number> = {};
    const tCounts: Record<string, number> = {};
    let mCount = 0;
    let uCount = 0;
    let synTotal = 0;
    let tTotal = 0;
    let utTotal = 0;

    const merged = products.map(p => {
      const systemCategory = p.internalCategory || 'NONE';
      const syncedCategory = p.lastSyncedCategory || null;
      const naverTag = p.naverTag || null;
      const isSynced = !!syncedCategory;
      const isTagged = !!naverTag;
      const isMismatch = isSynced && syncedCategory !== systemCategory &&
        getBaseStage(syncedCategory) !== getBaseStage(systemCategory);

      if (syncedCategory) {
        synCounts[syncedCategory] = (synCounts[syncedCategory] || 0) + 1;
        synTotal++;
      }
      sCounts[systemCategory] = (sCounts[systemCategory] || 0) + 1;

      if (naverTag) {
        const tagCategory = TAG_LABELS[naverTag] || naverTag;
        tCounts[tagCategory] = (tCounts[tagCategory] || 0) + 1;
        tTotal++;
      } else {
        utTotal++;
      }

      if (isMismatch) mCount++;
      if (!isSynced) uCount++;

      return { ...p, syncedCategory, systemCategory, naverTag, isMismatch, isSynced, isTagged };
    });

    return {
      mergedProducts: merged,
      syncedCounts: synCounts,
      systemCounts: sCounts,
      tagCounts: tCounts,
      mismatchCount: mCount,
      unsyncedCount: uCount,
      syncedTotal: synTotal,
      taggedTotal: tTotal,
      untaggedTotal: utTotal,
    };
  }, [products]);

  const systemArchiveTotal = ARCHIVE_SUBS.reduce((s, c) => s + (systemCounts[c] || 0), 0) + (systemCounts['ARCHIVE'] || 0);

  // 필터링
  const filteredProducts = useMemo(() => {
    return mergedProducts.filter(p => {
      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === 'MISMATCH') return p.isMismatch;
      if (selectedFilter === 'UNSYNCED') return !p.isSynced;
      if (selectedFilter === 'TAGGED') return p.isTagged;
      if (selectedFilter === 'UNTAGGED') return !p.isTagged;
      if (selectedFilter === '_ARCHIVE_TOTAL') return getBaseStage(p.systemCategory) === 'ARCHIVE';
      return p.systemCategory === selectedFilter;
    }).sort((a, b) => {
      if (a.isMismatch !== b.isMismatch) return a.isMismatch ? -1 : 1;
      return new Date(b.regDate).getTime() - new Date(a.regDate).getTime();
    });
  }, [mergedProducts, selectedFilter]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedItems = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCount = (key: string, source: Record<string, number>) => {
    if (key === '_ARCHIVE_TOTAL') {
      return ARCHIVE_SUBS.reduce((s, c) => s + (source[c] || 0), 0) + (source['ARCHIVE'] || 0);
    }
    return source[key] || 0;
  };

  return (
    <div className="space-y-6">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">네이버 현황</h2>
            <p className="text-[10px] text-slate-400">
              전체 {products.length}개 · 태그 {taggedTotal}개 · 전송기록 {syncedTotal}개 · 미전송 {unsyncedCount}개
              {mismatchCount > 0 && ` · 불일치 ${mismatchCount}개`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isScanning ? (
            <Button variant="destructive" size="sm" onClick={stopScan} className="gap-2">
              <Square className="w-4 h-4" /> 중지
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={startScan}
              className="gap-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
              <Download className="w-4 h-4" />
              네이버에서 불러오기
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" /> 갱신
          </Button>
        </div>
      </div>

      {/* 스캔 진행 바 */}
      {scanProgress && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
          <Progress value={(scanProgress.current / scanProgress.total) * 100} className="h-2" />
          <p className="text-xs text-slate-500">{scanProgress.message}</p>
        </div>
      )}

      {/* 스캔 결과 요약 */}
      {scanResult && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">스캔 완료 ({scanResult.totalTime})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(scanResult.counts).map(([cat, count]) => (
              <Badge key={cat} variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                {CATEGORY_LABELS[cat] || cat}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 태그 현황 요약 */}
      {taggedTotal > 0 && (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4 space-y-2">
          <p className="text-xs font-bold text-violet-700">네이버 태그 현황</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tagCounts).map(([label, count]) => (
              <Badge key={label} variant="secondary" className="text-[10px] bg-violet-50 text-violet-700">
                {label}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 4대 스테이지 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { stage: 'NEW', color: 'emerald' },
          { stage: 'CURATED', color: 'blue' },
          { stage: 'ARCHIVE', color: 'amber', count: systemArchiveTotal },
          { stage: 'CLEARANCE', color: 'red' },
        ].map(({ stage, color, count }) => (
          <Card key={stage} className={`border-${color}-100 bg-${color}-50/20 cursor-pointer hover:shadow-md transition-all`}
            onClick={() => { setSelectedFilter(stage === 'ARCHIVE' ? '_ARCHIVE_TOTAL' : stage); setCurrentPage(1); }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className={`text-[10px] font-bold text-${color}-600 uppercase`}>{stage}</p>
                <h4 className="text-2xl font-black text-slate-800">{count ?? (systemCounts[stage] || 0)}</h4>
              </div>
              <CheckCircle2 className={`w-8 h-8 text-${color}-200`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 카테고리 상세 비교 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setSelectedFilter('ALL'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              전체 {products.length}
            </button>
            <button onClick={() => { setSelectedFilter('TAGGED'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFilter === 'TAGGED' ? 'bg-violet-500 text-white shadow-md' : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'}`}>
              태그됨 {taggedTotal}
            </button>
            <button onClick={() => { setSelectedFilter('UNTAGGED'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFilter === 'UNTAGGED' ? 'bg-slate-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}>
              미태그 {untaggedTotal}
            </button>
            <button onClick={() => { setSelectedFilter('UNSYNCED'); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFilter === 'UNSYNCED' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'}`}>
              미전송 {unsyncedCount}
            </button>
            {mismatchCount > 0 && (
              <button onClick={() => { setSelectedFilter('MISMATCH'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFilter === 'MISMATCH' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100'}`}>
                불일치 {mismatchCount}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/50">
                <th className="px-5 py-3 text-left">카테고리</th>
                <th className="px-5 py-3 text-center">시스템 분류</th>
                <th className="px-5 py-3 text-center">전송 기록</th>
                <th className="px-5 py-3 text-center">차이</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TABLE_ROWS.map(({ key, label, indent }) => {
                const sCount = getCount(key, systemCounts);
                const nCount = getCount(key, syncedCounts);
                const diff = nCount - sCount;
                const isArchiveHeader = key === '_ARCHIVE_TOTAL';

                return (
                  <tr key={key}
                    onClick={() => { setSelectedFilter(key); setCurrentPage(1); }}
                    className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${selectedFilter === key ? 'bg-blue-50/40' : ''} ${isArchiveHeader ? 'bg-amber-50/30 font-bold' : ''}`}>
                    <td className="px-5 py-3">
                      <span className={`text-sm ${isArchiveHeader ? 'font-black text-amber-800' : 'font-bold text-slate-700'} ${indent ? 'pl-5 text-[13px]' : ''}`}>
                        {indent && <span className="text-slate-300 mr-1.5">└</span>}
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-sm font-black ${sCount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                        {sCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-sm font-bold ${nCount > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                        {nCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={diff === 0 ? 'outline' : diff > 0 ? 'default' : 'destructive'} className="font-mono text-[11px]">
                        {diff > 0 ? `+${diff}` : diff}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상품 리스트 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">{filteredProducts.length.toLocaleString()}개</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {paginatedItems.map(p => (
            <div key={p.originProductNo}
              className={`p-3 bg-white border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:shadow-md ${p.isMismatch ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3 w-full sm:flex-1 overflow-hidden">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] sm:text-[10px] text-slate-300">NO IMG</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">{p.originProductNo}</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-300">|</span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-500">
                      {p.regDate ? new Date(p.regDate).toLocaleDateString('ko-KR') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 min-[400px]:grid-cols-4 sm:flex items-center gap-4 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:pr-2">
                {/* 시스템 분류 */}
                <div className="text-left sm:text-center">
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase mb-1">시스템</p>
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-slate-100 whitespace-nowrap">
                    {CATEGORY_LABELS[p.systemCategory] || p.systemCategory}
                  </Badge>
                </div>

                {/* 네이버 태그 (스캔으로 읽어온 값) */}
                <div className="text-left sm:text-center">
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase mb-1">태그</p>
                  {p.naverTag ? (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] border-violet-200 text-violet-700 bg-violet-50 whitespace-nowrap">
                      {TAG_LABELS[p.naverTag] || p.naverTag}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] border-slate-200 text-slate-400 whitespace-nowrap">
                      없음
                    </Badge>
                  )}
                </div>

                {/* 전송 기록 */}
                <div className="text-left sm:text-center">
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase mb-1">전송</p>
                  {p.isSynced ? (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 whitespace-nowrap">
                      {CATEGORY_LABELS[p.syncedCategory!] || p.syncedCategory}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] border-slate-200 text-slate-400 whitespace-nowrap">
                      미전송
                    </Badge>
                  )}
                </div>

                {/* 경과일 */}
                <div className="text-left sm:text-center min-w-[40px]">
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase mb-1">경과</p>
                  <div className="flex items-center gap-1 sm:justify-center">
                    <span className={`text-[10px] sm:text-[11px] font-bold ${(p.lifecycle?.daysSince || 0) > 120 ? 'text-red-500' : (p.lifecycle?.daysSince || 0) > 60 ? 'text-amber-500' : 'text-slate-500'}`}>
                      {p.lifecycle?.daysSince || 0}일
                    </span>
                    {p.isMismatch && <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>이전</Button>
            <span className="flex items-center px-4 text-xs font-bold text-slate-500">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>다음</Button>
          </div>
        )}
      </div>

      {/* 안내 */}
      <Card className="border-slate-100 bg-slate-50/50">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 mb-1 text-xs">네이버 현황 안내</p>
            <ul className="list-disc ml-3 space-y-1">
              <li><strong>네이버에서 불러오기:</strong> 네이버 상품 상세 API를 스캔하여 실제 태그/전시카테고리 확인</li>
              <li><strong>시스템 분류:</strong> 라이프사이클 + 관리자 수동 분류 기준</li>
              <li><strong>네이버 태그:</strong> 네이버에서 읽어온 sellerTag (BS태그)</li>
              <li><strong>전송 기록:</strong> 상품관리에서 네이버로 전송한 기록</li>
              <li><strong>전시카테고리 전송은 상품관리 탭에서</strong> 진행</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
