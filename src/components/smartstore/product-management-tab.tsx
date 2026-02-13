'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProductAnalysisDetail } from './product-analysis-detail';

type VisionStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

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
  archiveInfo?: { category: string };
  internalCategory?: string;
  descriptionGrade?: string | null;
  suggestedArchiveId?: string;
  suggestionReason?: string;
  inferredBrand?: string;
  ocrText?: string;
  isApproved?: boolean;
  classification?: {
    brand: string;
    brandTier: string;
    gender: string;
    size: string;
    clothingType: string;
    clothingSubType: string;
    confidence: number;
    suggestedNaverCategory?: string;
    visionStatus?: VisionStatus;
    visionGrade?: string;
    visionColors?: string[];
  };
}

interface ProductManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

// 상품명에서 브랜드 추출: 한글 나오기 전까지 영문+특수문자 부분
function extractBrand(name: string): string {
  // "DOLCE&GABBANA 다크블루..." → "DOLCE&GABBANA"
  // "URBAN RESEARCH 어반 리서치..." → "URBAN RESEARCH"
  // "POLO RALPH LAUREN 폴로..." → "POLO RALPH LAUREN"
  const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
  return match ? match[1].trim() : name.split(' ')[0];
}

export function ProductManagementTab({ products, onRefresh }: ProductManagementTabProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [movingCategory, setMovingCategory] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [classifyingAI, setClassifyingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number; message: string; results: any[] } | null>(null);
  const [syncingGrades, setSyncingGrades] = useState(false);
  const [gradeProgress, setGradeProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // 카테고리 네비게이션
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [subFilter, setSubFilter] = useState<string>('ALL');
  const [curatedDaysFilter, setCuratedDaysFilter] = useState<number>(0); // 0=전체, 30, 60, 90

  const ARCHIVE_SUBS = ['MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE', 'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE'];
  const isArchiveCategory = (cat?: string) => cat === 'ARCHIVE' || ARCHIVE_SUBS.includes(cat || '');
  const isClearanceCategory = (cat?: string) => cat === 'CLEARANCE' || cat === 'CLEARANCE_KEEP' || cat === 'CLEARANCE_DISPOSE';

  // 스테이지별 카운트
  const stageCounts = useMemo(() => {
    const counts = { ALL: products.length, NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0, UNASSIGNED: 0 };
    products.forEach(p => {
      const cat = p.internalCategory || '';
      if (cat === 'NEW') counts.NEW++;
      else if (cat === 'CURATED') counts.CURATED++;
      else if (isArchiveCategory(cat)) counts.ARCHIVE++;
      else if (isClearanceCategory(cat)) counts.CLEARANCE++;
      else counts.UNASSIGNED++;
    });
    return counts;
  }, [products]);

  // NEW 초과분 (300개 초과시 오래된 순으로)
  const NEW_LIMIT = 300;
  const newOverflowCount = Math.max(0, stageCounts.NEW - NEW_LIMIT);
  const newOverflowIds = useMemo(() => {
    if (newOverflowCount <= 0) return [];
    const newProducts = products
      .filter(p => p.internalCategory === 'NEW')
      .sort((a, b) => new Date(a.regDate || 0).getTime() - new Date(b.regDate || 0).getTime());
    return newProducts.slice(0, newOverflowCount).map(p => p.originProductNo);
  }, [products, newOverflowCount]);

  // 아카이브 세부 카운트
  const archiveSubCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    ARCHIVE_SUBS.forEach(s => { counts[s] = 0; });
    counts['UNASSIGNED'] = 0;
    products.forEach(p => {
      const cat = p.internalCategory || '';
      if (!isArchiveCategory(cat)) return;
      counts.ALL++;
      if (ARCHIVE_SUBS.includes(cat)) counts[cat]++;
      else counts['UNASSIGNED']++;
    });
    return counts;
  }, [products]);

  // CURATED 기간별 카운트
  const curatedDaysCounts = useMemo(() => {
    const counts = { ALL: 0, under30: 0, d30: 0, d60: 0, d90: 0 };
    products.forEach(p => {
      if (p.internalCategory !== 'CURATED') return;
      counts.ALL++;
      const days = p.lifecycle?.daysSince || 0;
      if (days <= 30) counts.under30++;
      if (days >= 30) counts.d30++;
      if (days >= 60) counts.d60++;
      if (days >= 90) counts.d90++;
    });
    return counts;
  }, [products]);

  // 클리어런스 세부 카운트
  const clearanceSubCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0, CLEARANCE: 0, CLEARANCE_KEEP: 0, CLEARANCE_DISPOSE: 0, UNASSIGNED: 0 };
    products.forEach(p => {
      const cat = p.internalCategory || '';
      if (!isClearanceCategory(cat)) return;
      counts.ALL++;
      if (cat === 'CLEARANCE_KEEP') counts.CLEARANCE_KEEP++;
      else if (cat === 'CLEARANCE_DISPOSE') counts.CLEARANCE_DISPOSE++;
      else counts.CLEARANCE++;
    });
    return counts;
  }, [products]);

  // 개별 Vision 분석
  const analyzeProduct = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const id = product.originProductNo;
    if (analyzingIds.has(id)) return;

    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/smartstore/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originProductNo: id,
          name: product.name,
          imageUrl: product.thumbnailUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Vision 분석 완료: ${product.name.slice(0, 20)}...`);
        onRefresh();
      } else {
        toast.error(data.error || '분석 실패');
      }
    } catch (err: any) {
      toast.error('분석 오류: ' + err.message);
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // 선택 상품 카테고리 강제 이동 (네이버 동기화 없이 로컬 즉시 반영)
  const moveToCategory = async (category: string) => {
    if (selectedIds.length === 0) return;
    setMovingCategory(true);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: selectedIds, category })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${selectedIds.length}개 상품 → ${category} 이동 완료`);

        // 네이버 동기화 없이 React Query 캐시 직접 업데이트
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                selectedIds.includes(p.originProductNo)
                  ? { ...p, internalCategory: category, archiveTier: category }
                  : p
              )
            }
          };
        });

        // 서버 캐시 무효화 (백그라운드, 다음 페이지 로드 시 DB에서 재빌드)
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => {});

        setSelectedIds([]);
        setShowMoveMenu(false);
      } else {
        toast.error(data.error || '이동 실패');
      }
    } catch (err: any) {
      toast.error('이동 오류: ' + err.message);
    } finally {
      setMovingCategory(false);
    }
  };

  // NEW 초과분 → CURATED 일괄 이동
  const moveOverflowToCurated = async () => {
    if (newOverflowIds.length === 0) return;
    if (!confirm(`NEW 상품 중 가장 오래된 ${newOverflowIds.length}개를 CURATED로 이동하시겠습니까?`)) return;
    setMovingCategory(true);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: newOverflowIds, category: 'CURATED' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${newOverflowIds.length}개 상품 → CURATED 이동 완료`);
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          const moveSet = new Set(newOverflowIds);
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                moveSet.has(p.originProductNo)
                  ? { ...p, internalCategory: 'CURATED', archiveTier: 'CURATED' }
                  : p
              )
            }
          };
        });
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => {});
      } else {
        toast.error(data.error || '이동 실패');
      }
    } catch (err: any) {
      toast.error('이동 오류: ' + err.message);
    } finally {
      setMovingCategory(false);
    }
  };

  // 자동 분류로 복원 (internal_category를 NULL로, 라이프사이클 기반 자동 결정)
  const resetToAuto = async () => {
    if (selectedIds.length === 0) return;
    setMovingCategory(true);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: selectedIds, reset: true })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${selectedIds.length}개 상품 자동 분류로 복원`);

        // 네이버 동기화 없이 React Query 캐시 직접 업데이트
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) => {
                if (!selectedIds.includes(p.originProductNo)) return p;
                // 라이프사이클 스테이지로 자동 복원
                const stage = p.lifecycle?.stage || 'NEW';
                return { ...p, internalCategory: stage, archiveTier: null };
              })
            }
          };
        });

        // 서버 캐시 무효화
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => {});

        setSelectedIds([]);
        setShowMoveMenu(false);
      } else {
        toast.error(data.error || '복원 실패');
      }
    } catch (err: any) {
      toast.error('복원 오류: ' + err.message);
    } finally {
      setMovingCategory(false);
    }
  };

  // AI 아카이브 자동 분류 (3-Phase: Brand Search → Vision → Fusion)
  const classifyWithAI = async () => {
    if (selectedIds.length === 0 || classifyingAI) return;

    // 선택된 상품 데이터 수집
    const selectedProducts = products
      .filter(p => selectedIds.includes(p.originProductNo))
      .map(p => ({
        id: p.originProductNo,
        name: p.name,
        imageUrl: p.thumbnailUrl || '',
      }));

    setClassifyingAI(true);
    setAiProgress({ current: 0, total: selectedProducts.length, message: 'AI 분류 시작...', results: [] });
    setShowMoveMenu(false);

    try {
      const res = await fetch('/api/smartstore/automation/archive-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: selectedProducts }),
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
              allResults.push(event);
              setAiProgress(prev => prev ? { ...prev, current: event.current, message: `${event.product} → ${event.category}`, results: [...allResults] } : prev);
              toast.success(`${event.product}... → ${event.category} (${event.confidence}%)`, { duration: 2000 });
            } else if (event.type === 'error') {
              allResults.push({ ...event, category: 'ARCHIVE' });
              toast.error(`${event.product}... 분류 실패`, { duration: 2000 });
            } else if (event.type === 'complete') {
              // React Query 캐시 직접 업데이트 (네이버 동기화 없음)
              queryClient.setQueryData(['all-products'], (old: any) => {
                if (!old?.data?.contents) return old;
                const categoryMap: Record<string, string> = {};
                event.results.forEach((r: any) => { categoryMap[r.productId] = r.category; });
                return {
                  ...old,
                  data: {
                    ...old.data,
                    contents: old.data.contents.map((p: any) =>
                      categoryMap[p.originProductNo]
                        ? { ...p, internalCategory: categoryMap[p.originProductNo], archiveTier: categoryMap[p.originProductNo] }
                        : p
                    ),
                  },
                };
              });

              toast.success(`AI 분류 완료: ${event.success}개 성공, ${event.failed}개 실패`);
            }
          } catch { /* JSON 파싱 실패 무시 */ }
        }
      }

      setSelectedIds([]);
    } catch (err: any) {
      toast.error('AI 분류 오류: ' + err.message);
    } finally {
      setClassifyingAI(false);
      setAiProgress(null);
    }
  };

  // GRADE 일괄 동기화 (네이버 상세페이지에서 추출)
  const syncGrades = async () => {
    if (syncingGrades) return;
    setSyncingGrades(true);
    setGradeProgress({ current: 0, total: 0, message: 'GRADE 동기화 시작...' });

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
              setGradeProgress({ current: 0, total: event.total, message: `${event.total}개 상품 GRADE 동기화 시작` });
            } else if (event.type === 'progress') {
              setGradeProgress({ current: event.current, total: event.total, message: `${event.product}... ${event.message}` });
            } else if (event.type === 'complete') {
              toast.success(`GRADE 동기화 완료: ${event.success}개 성공`);
              // 서버 캐시 무효화 후 새로고침
              fetch('/api/smartstore/products?invalidateCache=true').catch(() => {});
              onRefresh();
            }
          } catch { /* 무시 */ }
        }
      }
    } catch (err: any) {
      toast.error('GRADE 동기화 오류: ' + err.message);
    } finally {
      setSyncingGrades(false);
      setGradeProgress(null);
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('상품코드가 복사되었습니다: ' + text);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 카테고리 기반 필터링
  const filtered = products.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.originProductNo.includes(searchTerm) ||
      (p.sellerManagementCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    const cat = p.internalCategory || '';

    // 스테이지 필터
    if (stageFilter === 'ALL') return true;
    if (stageFilter === 'NEW') return cat === 'NEW';
    if (stageFilter === 'CURATED') {
      if (cat !== 'CURATED') return false;
      if (curatedDaysFilter === -30) {
        return (p.lifecycle?.daysSince || 0) <= 30;
      }
      if (curatedDaysFilter > 0) {
        return (p.lifecycle?.daysSince || 0) >= curatedDaysFilter;
      }
      return true;
    }
    if (stageFilter === 'UNASSIGNED') return !cat || cat === 'UNCATEGORIZED';
    if (stageFilter === 'ARCHIVE') {
      if (!isArchiveCategory(cat)) return false;
      if (subFilter === 'ALL') return true;
      if (subFilter === 'UNASSIGNED') return cat === 'ARCHIVE';
      return cat === subFilter;
    }
    if (stageFilter === 'CLEARANCE') {
      if (!isClearanceCategory(cat)) return false;
      if (subFilter === 'ALL') return true;
      return cat === subFilter;
    }
    return true;
  });

  // 정렬
  const GRADE_ORDER: Record<string, number> = { 'V급': 0, 'S급': 1, 'A급': 2, 'B급': 3, 'C급': 4 };
  const CATEGORY_ORDER: Record<string, number> = {
    'MILITARY': 0, 'MILITARY ARCHIVE': 0,
    'WORKWEAR': 1, 'WORKWEAR ARCHIVE': 1,
    'JAPAN': 2, 'JAPANESE ARCHIVE': 2,
    'HERITAGE': 3, 'HERITAGE EUROPE': 3,
    'BRITISH': 4, 'BRITISH ARCHIVE': 4,
    'OUTDOOR': 5, 'OUTDOOR ARCHIVE': 5,
    'CLEARANCE_KEEP': 6, 'CLEARANCE_DISPOSE': 7,
    'CLEARANCE': 8, 'NEW': 9, 'CURATED': 10, 'UNCATEGORIZED': 11,
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'date_desc':
        return arr.sort((a, b) => new Date(b.regDate || 0).getTime() - new Date(a.regDate || 0).getTime());
      case 'date_asc':
        return arr.sort((a, b) => new Date(a.regDate || 0).getTime() - new Date(b.regDate || 0).getTime());
      case 'category':
        return arr.sort((a, b) => {
          const ca = CATEGORY_ORDER[a.internalCategory || 'UNCATEGORIZED'] ?? 99;
          const cb = CATEGORY_ORDER[b.internalCategory || 'UNCATEGORIZED'] ?? 99;
          return ca - cb;
        });
      case 'grade':
        return arr.sort((a, b) => {
          const gradeA = a.classification?.visionGrade || (a.descriptionGrade ? `${a.descriptionGrade}급` : 'C급');
          const gradeB = b.classification?.visionGrade || (b.descriptionGrade ? `${b.descriptionGrade}급` : 'C급');
          const ga = GRADE_ORDER[gradeA] ?? 99;
          const gb = GRADE_ORDER[gradeB] ?? 99;
          return ga - gb;
        });
      case 'price_desc':
        return arr.sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
      case 'price_asc':
        return arr.sort((a, b) => (a.salePrice || 0) - (b.salePrice || 0));
      case 'confidence':
        return arr.sort((a, b) => (b.classification?.confidence || 0) - (a.classification?.confidence || 0));
      default:
        return arr;
    }
  }, [filtered, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginatedItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 현재 페이지 전체 선택/해제
  const toggleSelectAll = () => {
    const pageIds = paginatedItems.map(p => p.originProductNo);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every(p => selectedIds.includes(p.originProductNo));

  // Reset page when filters change
  const handleStageChange = (stage: string) => {
    setStageFilter(stage);
    setSubFilter('ALL');
    setCuratedDaysFilter(0);
    setCurrentPage(1);
  };

  const handleSubChange = (sub: string) => {
    setSubFilter(sub);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <input
        type="text"
        placeholder="상품명, 상품번호, 관리코드 검색..."
        value={searchTerm}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />

      {/* 라이프사이클 스테이지 네비게이션 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-6 divide-x divide-slate-100">
          {([
            ['ALL', '전체', stageCounts.ALL, 'text-slate-600'],
            ['NEW', 'NEW', stageCounts.NEW, 'text-emerald-600'],
            ['CURATED', 'CURATED', stageCounts.CURATED, 'text-indigo-600'],
            ['ARCHIVE', 'ARCHIVE', stageCounts.ARCHIVE, 'text-slate-800'],
            ['CLEARANCE', 'CLEARANCE', stageCounts.CLEARANCE, 'text-amber-600'],
            ['UNASSIGNED', '미지정', stageCounts.UNASSIGNED, 'text-red-500'],
          ] as [string, string, number, string][]).map(([key, label, count, color]) => (
            <button
              key={key}
              onClick={() => handleStageChange(key)}
              className={`py-3 text-center transition-all active:scale-95 ${stageFilter === key
                ? 'bg-slate-900 text-white'
                : 'bg-white hover:bg-slate-50'
                }`}
            >
              <div className={`text-[10px] font-black uppercase tracking-tight ${stageFilter === key ? 'text-white' : color}`}>
                {label}
              </div>
              <div className={`text-lg font-black leading-none mt-0.5 ${stageFilter === key ? 'text-white' : 'text-slate-900'}`}>
                {count}
              </div>
            </button>
          ))}
        </div>

        {/* NEW 초과 경고 + 일괄 이동 */}
        {newOverflowCount > 0 && (stageFilter === 'ALL' || stageFilter === 'NEW') && (
          <div className="border-t border-amber-200 p-2.5 bg-amber-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-600 text-sm font-bold shrink-0">!</span>
              <span className="text-[11px] font-bold text-amber-800 truncate">
                NEW {stageCounts.NEW}개 (제한 {NEW_LIMIT}) — <span className="text-red-600">{newOverflowCount}개 초과</span>
              </span>
            </div>
            <button
              onClick={moveOverflowToCurated}
              disabled={movingCategory}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {movingCategory ? '이동 중...' : `오래된 ${newOverflowCount}개 → CURATED`}
            </button>
          </div>
        )}

        {/* CURATED 기간별 필터 */}
        {stageFilter === 'CURATED' && (
          <div className="border-t border-slate-100 p-2 bg-indigo-50/50">
            <div className="flex gap-1 flex-wrap">
              {([
                [0, '전체', curatedDaysCounts.ALL],
                [-30, '30일이하', curatedDaysCounts.under30],
                [30, '30일+', curatedDaysCounts.d30],
                [60, '60일+', curatedDaysCounts.d60],
                [90, '90일+', curatedDaysCounts.d90],
              ] as [number, string, number][]).map(([days, label, count]) => (
                <button
                  key={days}
                  onClick={() => { setCuratedDaysFilter(days); setCurrentPage(1); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${curatedDaysFilter === days ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
                >
                  {label} {count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ARCHIVE 세부 카테고리 */}
        {stageFilter === 'ARCHIVE' && (
          <div className="border-t border-slate-100 p-2 bg-slate-50">
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => handleSubChange('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${subFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                전체 {archiveSubCounts.ALL}
              </button>
              {ARCHIVE_SUBS.map(sub => (
                <button
                  key={sub}
                  onClick={() => handleSubChange(sub)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${subFilter === sub ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {sub.replace(' ARCHIVE', '')} {archiveSubCounts[sub]}
                </button>
              ))}
              <button
                onClick={() => handleSubChange('UNASSIGNED')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${subFilter === 'UNASSIGNED' ? 'bg-red-600 text-white' : 'bg-white text-red-500 border border-red-200 hover:bg-red-50'}`}
              >
                미지정 {archiveSubCounts['UNASSIGNED']}
              </button>
            </div>
          </div>
        )}

        {/* CLEARANCE 세부 카테고리 */}
        {stageFilter === 'CLEARANCE' && (
          <div className="border-t border-slate-100 p-2 bg-amber-50/50">
            <div className="flex gap-1 flex-wrap">
              {([
                ['ALL', '전체', clearanceSubCounts.ALL],
                ['CLEARANCE', '미분류', clearanceSubCounts.CLEARANCE],
                ['CLEARANCE_KEEP', '판매유지', clearanceSubCounts.CLEARANCE_KEEP],
                ['CLEARANCE_DISPOSE', '폐기결정', clearanceSubCounts.CLEARANCE_DISPOSE],
              ] as [string, string, number][]).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => handleSubChange(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${subFilter === key ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'}`}
                >
                  {label} {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 선택 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-lg ring-1 ring-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelectedIds([]); setShowMoveMenu(false); }} className="p-1 text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <span className="text-sm">선택됨: <span className="text-blue-400 font-bold">{selectedIds.length}</span></span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={classifyWithAI}
                disabled={classifyingAI || movingCategory}
                className={`px-3 py-2 text-xs rounded-lg font-bold transition-colors ${classifyingAI ? 'bg-violet-600 text-white animate-pulse' : 'bg-violet-500/80 text-white hover:bg-violet-500'}`}
              >
                {classifyingAI
                  ? `AI 분류 중 ${aiProgress ? `${aiProgress.current}/${aiProgress.total}` : '...'}`
                  : 'AI 아카이브 분류'}
              </button>
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                disabled={movingCategory || classifyingAI}
                className={`px-3 py-2 text-xs rounded-lg font-bold transition-colors ${showMoveMenu ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {movingCategory ? '이동 중...' : '카테고리 이동'}
              </button>
            </div>
          </div>

          {/* AI 분류 진행 상태 */}
          {classifyingAI && aiProgress && (
            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((aiProgress.current / aiProgress.total) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-violet-300">{aiProgress.current}/{aiProgress.total}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{aiProgress.message}</p>
              {aiProgress.results.length > 0 && (
                <div className="mt-1.5 max-h-20 overflow-y-auto space-y-0.5">
                  {aiProgress.results.slice(-3).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px]">
                      <span className={`px-1 py-px rounded font-bold ${r.category === 'ARCHIVE' ? 'bg-red-500/20 text-red-300' : 'bg-violet-500/20 text-violet-300'}`}>
                        {r.category?.replace(' ARCHIVE', '') || '?'}
                      </span>
                      <span className="text-slate-400 truncate">{r.product}</span>
                      {r.confidence > 0 && <span className="text-slate-500 ml-auto">{r.confidence}%</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 카테고리 선택 메뉴 */}
          {showMoveMenu && !classifyingAI && (
            <div className="border-t border-white/10 pt-2 space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">아카이브 (날짜 무시, 강제 배정)</p>
              <div className="grid grid-cols-3 gap-1">
                {['MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE', 'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => moveToCategory(cat)}
                    disabled={movingCategory}
                    className="px-2 py-2 text-[10px] font-bold bg-slate-800 text-slate-300 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors text-center leading-tight"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 pt-1">클리어런스 (날짜 무시, 강제 배정)</p>
              <div className="grid grid-cols-3 gap-1">
                {['CLEARANCE', 'CLEARANCE_KEEP', 'CLEARANCE_DISPOSE'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => moveToCategory(cat)}
                    disabled={movingCategory}
                    className="px-2 py-2 text-[10px] font-bold bg-slate-800 text-amber-400 rounded-lg hover:bg-amber-600 hover:text-white transition-colors"
                  >
                    {cat === 'CLEARANCE' ? '클리어런스' : cat === 'CLEARANCE_KEEP' ? '판매유지' : '폐기결정'}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 pt-1">기타</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => moveToCategory('NEW')}
                  disabled={movingCategory}
                  className="px-2 py-2 text-[10px] font-bold bg-slate-800 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  NEW
                </button>
                <button
                  onClick={() => moveToCategory('CURATED')}
                  disabled={movingCategory}
                  className="px-2 py-2 text-[10px] font-bold bg-slate-800 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  CURATED
                </button>
                <button
                  onClick={() => resetToAuto()}
                  disabled={movingCategory}
                  className="px-2 py-2 text-[10px] font-bold bg-slate-800 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                >
                  자동복원
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 정렬 + 뷰모드 + 결과 수 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">{sorted.length.toLocaleString()}개</span>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
            className="text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="date_desc">최신순</option>
            <option value="date_asc">오래된순</option>
            <option value="category">카테고리별</option>
            <option value="grade">등급순 (V→B)</option>
            <option value="price_desc">가격 높은순</option>
            <option value="price_asc">가격 낮은순</option>
            <option value="confidence">신뢰도순</option>
          </select>
          <button
            onClick={syncGrades}
            disabled={syncingGrades}
            className={`text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors ${syncingGrades ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'}`}
          >
            {syncingGrades ? `GRADE ${gradeProgress ? `${gradeProgress.current}/${gradeProgress.total}` : '...'}` : 'GRADE 동기화'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="목록 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="카드 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {[50, 100, 300, 500].map(size => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${pageSize === size ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 컴팩트 테이블 뷰 */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-2 py-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-2 py-2 text-left">상품코드</th>
                <th className="px-1 py-2 w-9"></th>
                <th className="px-2 py-2 text-left">상품명</th>
                <th className="px-2 py-2 text-left">브랜드</th>
                <th className="px-2 py-2 text-right">소비자가</th>
                <th className="px-2 py-2 text-right">판매가</th>
                <th className="px-2 py-2 text-center">GRADE</th>
                <th className="px-2 py-2 text-center">등록일</th>
                <th className="px-2 py-2 text-center">경과일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedItems.map(p => {
                const isSelected = selectedIds.includes(p.originProductNo);
                const discountRate = p.lifecycle?.discountRate || 0;
                const hasDiscount = discountRate > 0 && p.lifecycle?.stage !== 'NEW';
                const discountedPrice = hasDiscount ? Math.round(p.salePrice * (1 - discountRate / 100)) : p.salePrice;

                // CURATED 그라데이션: 0일=흰색 → 90일=파란색
                const isCurated = stageFilter === 'CURATED' && p.internalCategory === 'CURATED';
                const curatedDays = p.lifecycle?.daysSince || 0;
                const gradientIntensity = isCurated ? Math.min(curatedDays / 90, 1) : 0;
                const rowBgStyle = isCurated && !isSelected
                  ? { backgroundColor: `rgba(59, 130, 246, ${gradientIntensity * 0.15})` }
                  : undefined;

                return (
                  <tr
                    key={p.originProductNo}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/60' : ''}`}
                    style={rowBgStyle}
                    onClick={() => toggleSelect(p.originProductNo)}
                  >
                    <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.originProductNo)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-[9px] font-mono font-bold text-violet-600 whitespace-nowrap">
                        {p.sellerManagementCode || '-'}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <div className="w-8 h-8 rounded overflow-hidden bg-slate-100 shrink-0">
                        {p.thumbnailUrl ? (
                          <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-[7px] font-bold">IMG</div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 max-w-[200px]">
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                        {p.classification?.brand || extractBrand(p.name)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`text-[10px] font-bold whitespace-nowrap ${hasDiscount ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {p.salePrice?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {hasDiscount ? (
                        <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">
                          {discountedPrice.toLocaleString()}
                          <span className="text-[8px] ml-0.5">-{discountRate}%</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                          {p.salePrice?.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {(() => {
                        // 우선순위: visionGrade > descriptionGrade
                        const vg = p.classification?.visionGrade;
                        const dg = p.descriptionGrade;
                        const grade = vg || (dg ? `${dg}급` : null);
                        if (!grade) return <span className="text-[9px] text-slate-300">-</span>;
                        return (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black leading-none ${
                            grade.startsWith('S') ? 'bg-yellow-100 text-yellow-700' :
                            grade.startsWith('A') ? 'bg-blue-100 text-blue-700' :
                            grade.startsWith('B') ? 'bg-slate-100 text-slate-600' :
                            grade.startsWith('V') ? 'bg-purple-100 text-purple-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {grade}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-[9px] text-slate-500 whitespace-nowrap">
                        {p.regDate ? new Date(p.regDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`text-[10px] font-bold ${
                        (p.lifecycle?.daysSince || 0) > 120 ? 'text-red-500' :
                        (p.lifecycle?.daysSince || 0) > 60 ? 'text-amber-500' :
                        (p.lifecycle?.daysSince || 0) > 30 ? 'text-blue-500' :
                        'text-slate-400'
                      }`}>
                        D+{p.lifecycle?.daysSince || 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 상품 카드 리스트 */}
      {viewMode === 'card' && (
      <div className="space-y-2.5">
        {paginatedItems.map(p => (
          <div
            key={p.originProductNo}
            className={`group bg-white rounded-xl border p-3 hover:shadow-md transition-all cursor-pointer ${selectedIds.includes(p.originProductNo) ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/20' : 'border-slate-100'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(p.originProductNo);
            }}
          >
            <div className="flex gap-4">
              {/* 이미지 */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-inner">
                {p.thumbnailUrl ? (
                  <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-bold">IMAGE</div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div
                      className="flex items-center gap-1 group/copy cursor-copy"
                      onClick={(e) => handleCopy(e, p.originProductNo)}
                      title="클릭하여 복사"
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-400 group-hover/copy:text-blue-500 transition-colors">
                        #{p.originProductNo}
                      </span>
                      <svg className="w-2.5 h-2.5 text-slate-300 group-hover/copy:text-blue-500 opacity-0 group-hover/copy:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-px rounded uppercase ${p.internalCategory === 'UNCATEGORIZED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {p.internalCategory}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {p.sellerManagementCode ? (
                      <span className="text-[10px] font-mono font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                        {p.sellerManagementCode}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-mono">-</span>
                    )}
                    <span className="w-px h-2.5 bg-slate-200"></span>
                    {p.regDate && (
                      <span className="text-[10px] text-slate-500 font-medium tracking-tight">
                        {new Date(p.regDate).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-slate-900 line-clamp-1 leading-tight mb-1.5">{p.name}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {p.lifecycle && p.lifecycle.discountRate > 0 && p.lifecycle.stage !== 'NEW' ? (
                    <>
                      <span className="text-[11px] font-bold text-slate-400 line-through">{p.salePrice?.toLocaleString()}</span>
                      <span className="text-[13px] font-extrabold text-red-600">
                        {Math.round(p.salePrice * (1 - p.lifecycle.discountRate / 100)).toLocaleString()}원
                      </span>
                      <span className="text-[10px] font-black text-red-500 bg-red-50 px-1 py-px rounded">-{p.lifecycle.discountRate}%</span>
                    </>
                  ) : (
                    <span className="text-[13px] font-extrabold text-blue-600">{p.salePrice?.toLocaleString()}원</span>
                  )}
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className={`text-[11px] font-bold ${p.stockQuantity === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                    재고 {p.stockQuantity}
                  </span>

                  {p.lifecycle && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black tracking-tighter ${p.lifecycle.stage === 'NEW' ? 'bg-emerald-500 text-white' :
                      p.lifecycle.stage === 'CURATED' ? 'bg-indigo-500 text-white' :
                        p.lifecycle.stage === 'ARCHIVE' ? 'bg-slate-800 text-white' :
                          'bg-amber-500 text-white'
                      }`}>
                      {p.lifecycle.stage}
                    </span>
                  )}

                  {/* Vision 상태 배지 */}
                  {p.classification?.visionStatus === 'completed' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors cursor-pointer"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {p.classification.visionGrade || 'A급'}
                    </button>
                  ) : p.classification?.visionStatus === 'processing' || analyzingIds.has(p.originProductNo) ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 animate-pulse">
                      분석중
                    </span>
                  ) : p.thumbnailUrl ? (
                    <button
                      onClick={(e) => analyzeProduct(e, p)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600 transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      분석
                    </button>
                  ) : null}
                  {/* 상세 보기 버튼 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    상세
                  </button>
                </div>
              </div>
            </div>

            {/* AI 다차원 분류 결과 */}
            {p.classification && (
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">AI 다차원 분류</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.classification.confidence >= 70 ? 'bg-emerald-500' : p.classification.confidence >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${p.classification.confidence}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black ${p.classification.confidence >= 70 ? 'text-emerald-600' : p.classification.confidence >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {p.classification.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* 브랜드 + 티어 */}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${p.classification.brandTier === 'LUXURY' ? 'bg-purple-100 text-purple-800' :
                        p.classification.brandTier === 'PREMIUM' ? 'bg-indigo-100 text-indigo-700' :
                          p.classification.brandTier === 'DESIGNER' ? 'bg-blue-100 text-blue-700' :
                            p.classification.brandTier === 'CONTEMPORARY' ? 'bg-cyan-100 text-cyan-700' :
                              p.classification.brandTier === 'SPORTSWEAR' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-600'
                      }`}>
                      {p.classification.brand || extractBrand(p.name)}
                      <span className="opacity-60 text-[8px]">{p.classification.brandTier}</span>
                    </span>

                    {/* 의류 타입 */}
                    {p.classification.clothingType !== 'UNKNOWN' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                        {p.classification.clothingType === 'OUTERWEAR' ? '아우터' :
                          p.classification.clothingType === 'TOPS' ? '상의' :
                            p.classification.clothingType === 'BOTTOMS' ? '하의' :
                              p.classification.clothingType === 'DRESS' ? '원피스' : '기타'}
                        {p.classification.clothingSubType !== 'UNKNOWN' && (
                          <span className="text-[8px] opacity-70">{p.classification.clothingSubType}</span>
                        )}
                      </span>
                    )}

                    {/* 성별 */}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.classification.gender === 'MAN' ? 'bg-blue-100 text-blue-700' :
                        p.classification.gender === 'WOMAN' ? 'bg-pink-100 text-pink-700' :
                          p.classification.gender === 'KIDS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-500'
                      }`}>
                      {p.classification.gender === 'MAN' ? 'M' : p.classification.gender === 'WOMAN' ? 'W' : p.classification.gender === 'KIDS' ? 'K' : '-'}
                      {p.classification.size && p.classification.size !== 'FREE' && (
                        <span className="ml-0.5 opacity-70">/{p.classification.size}</span>
                      )}
                    </span>
                  </div>

                  {/* 네이버 카테고리 제안 */}
                  {p.classification.suggestedNaverCategory && (
                    <p className="text-[9px] text-slate-400 truncate">
                      <span className="font-bold text-blue-500">네이버</span> {p.classification.suggestedNaverCategory}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* 페이지네이션 하단 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="flex items-center gap-1">
            {/* Simple range of pages around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p className="text-sm font-bold text-slate-400">
            {searchTerm ? '검색 결과가 없습니다.' :
             stageFilter === 'UNASSIGNED' ? '미지정 상품이 없습니다.' :
             stageFilter !== 'ALL' ? `${stageFilter} 카테고리에 상품이 없습니다.` :
             '표시할 상품이 없습니다.'}
          </p>
        </div>
      )}
      {/* AI 분석 상세 모달 */}
      {detailProduct && (
        <ProductAnalysisDetail
          open={!!detailProduct}
          onClose={() => setDetailProduct(null)}
          product={detailProduct}
          onSaved={() => {
            setDetailProduct(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
