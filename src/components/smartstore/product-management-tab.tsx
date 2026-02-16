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
  onSyncGrades?: () => void;
  syncingGrades?: boolean;
  onClassifyAI?: (products: { id: string; name: string; imageUrl: string }[]) => void;
  classifyingAI?: boolean;
}

// 상품명에서 브랜드 추출: 한글 나오기 전까지 영문+특수문자 부분
function extractBrand(name: string): string {
  // "DOLCE&GABBANA 다크블루..." → "DOLCE&GABBANA"
  // "URBAN RESEARCH 어반 리서치..." → "URBAN RESEARCH"
  // "POLO RALPH LAUREN 폴로..." → "POLO RALPH LAUREN"
  const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
  return match ? match[1].trim() : name.split(' ')[0];
}

export function ProductManagementTab({ products, onRefresh, onSyncGrades, syncingGrades = false, onClassifyAI, classifyingAI = false }: ProductManagementTabProps) {
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
  const [syncingDisplay, setSyncingDisplay] = useState(false);
  const [displaySyncProgress, setDisplaySyncProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // 카테고리 네비게이션
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [subFilter, setSubFilter] = useState<string>('ALL');
  const [curatedDaysFilter, setCuratedDaysFilter] = useState<number>(0); // 0=전체, 30, 60, 90
  const [newDaysFilter, setNewDaysFilter] = useState<boolean>(false); // true=30일 경과만
  const [archiveDaysFilter, setArchiveDaysFilter] = useState<boolean>(false); // true=120일 경과만

  const ARCHIVE_SUBS = ['MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE', 'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE'];
  const isArchiveCategory = (cat?: string) => cat === 'ARCHIVE' || ARCHIVE_SUBS.includes(cat || '');
  const isClearanceCategory = (cat?: string) => cat === 'CLEARANCE' || cat === 'CLEARANCE_KEEP' || cat === 'CLEARANCE_DISPOSE';

  // 모든 카운트를 1회 순회로 통합 계산
  const { stageCounts, archiveSubCounts, curatedDaysCounts, clearanceSubCounts, newOver30Count, archiveOver120Count } = useMemo(() => {
    const stage = { ALL: products.length, NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0, UNASSIGNED: 0 };
    const archive: Record<string, number> = { ALL: 0, UNASSIGNED: 0 };
    ARCHIVE_SUBS.forEach(s => { archive[s] = 0; });
    const curated = { ALL: 0, under30: 0, d30: 0, d60: 0, d90: 0 };
    const clearance: Record<string, number> = { ALL: 0, CLEARANCE: 0, CLEARANCE_KEEP: 0, CLEARANCE_DISPOSE: 0 };
    let newOver30 = 0;
    let archiveOver120 = 0;

    for (const p of products) {
      const cat = p.internalCategory || '';
      const days = p.lifecycle?.daysSince || 0;
      if (cat === 'NEW') {
        stage.NEW++;
        if (days >= 30) newOver30++;
      } else if (cat === 'CURATED') {
        stage.CURATED++;
        curated.ALL++;
        if (days <= 30) curated.under30++;
        if (days >= 30) curated.d30++;
        if (days >= 60) curated.d60++;
        if (days >= 90) curated.d90++;
      } else if (isArchiveCategory(cat)) {
        stage.ARCHIVE++;
        archive.ALL++;
        if (ARCHIVE_SUBS.includes(cat)) archive[cat]++;
        else archive.UNASSIGNED++;
        if (days >= 120) archiveOver120++;
      } else if (isClearanceCategory(cat)) {
        stage.CLEARANCE++;
        clearance.ALL++;
        if (cat === 'CLEARANCE_KEEP') clearance.CLEARANCE_KEEP++;
        else if (cat === 'CLEARANCE_DISPOSE') clearance.CLEARANCE_DISPOSE++;
        else clearance.CLEARANCE++;
      } else {
        stage.UNASSIGNED++;
      }
    }

    return { stageCounts: stage, archiveSubCounts: archive, curatedDaysCounts: curated, clearanceSubCounts: clearance, newOver30Count: newOver30, archiveOver120Count: archiveOver120 };
  }, [products]);

  // 각 카테고리 300개 제한 (초과시 오래된 순으로 다음 라이프사이클 이동)
  const STAGE_LIMIT = 300;
  const newOverflowCount = Math.max(0, stageCounts.NEW - STAGE_LIMIT);
  const curatedOverflowCount = Math.max(0, stageCounts.CURATED - STAGE_LIMIT);

  // 아카이브: 중분류별 300개 제한
  const archiveSubOverflows = useMemo(() => {
    const overflows: { sub: string; label: string; count: number; overflow: number; ids: string[] }[] = [];
    const labelMap: Record<string, string> = {
      'MILITARY ARCHIVE': 'Military', 'WORKWEAR ARCHIVE': 'Workwear', 'OUTDOOR ARCHIVE': 'Outdoor',
      'JAPANESE ARCHIVE': 'Japan', 'HERITAGE EUROPE': 'Euro Vintage', 'BRITISH ARCHIVE': 'British', 'UNISEX ARCHIVE': 'Unisex'
    };
    for (const sub of ARCHIVE_SUBS) {
      const subCount = archiveSubCounts[sub] || 0;
      if (subCount > STAGE_LIMIT) {
        const overflow = subCount - STAGE_LIMIT;
        const ids = products
          .filter(p => p.internalCategory === sub)
          .sort((a, b) => new Date(a.regDate || 0).getTime() - new Date(b.regDate || 0).getTime())
          .slice(0, overflow).map(p => p.originProductNo);
        overflows.push({ sub, label: labelMap[sub] || sub, count: subCount, overflow, ids });
      }
    }
    return overflows;
  }, [products, archiveSubCounts]);

  const newOverflowIds = useMemo(() => {
    if (newOverflowCount <= 0) return [];
    return products
      .filter(p => p.internalCategory === 'NEW')
      .sort((a, b) => new Date(a.regDate || 0).getTime() - new Date(b.regDate || 0).getTime())
      .slice(0, newOverflowCount).map(p => p.originProductNo);
  }, [products, newOverflowCount]);

  const curatedOverflowIds = useMemo(() => {
    if (curatedOverflowCount <= 0) return [];
    return products
      .filter(p => p.internalCategory === 'CURATED')
      .sort((a, b) => new Date(a.regDate || 0).getTime() - new Date(b.regDate || 0).getTime())
      .slice(0, curatedOverflowCount).map(p => p.originProductNo);
  }, [products, curatedOverflowCount]);

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
                selectedIds.includes(String(p.originProductNo))
                  ? { ...p, internalCategory: category, archiveTier: category }
                  : p
              )
            }
          };
        });

        // 서버 캐시 무효화 (백그라운드, 다음 페이지 로드 시 DB에서 재빌드)
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => { });

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
          const moveSet = new Set(newOverflowIds.map(String));
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                moveSet.has(String(p.originProductNo))
                  ? { ...p, internalCategory: 'CURATED', archiveTier: 'CURATED' }
                  : p
              )
            }
          };
        });
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => { });
      } else {
        toast.error(data.error || '이동 실패');
      }
    } catch (err: any) {
      toast.error('이동 오류: ' + err.message);
    } finally {
      setMovingCategory(false);
    }
  };

  // CURATED 초과분 → ARCHIVE 일괄 이동
  const moveOverflowToArchive = async () => {
    if (curatedOverflowIds.length === 0) return;
    setMovingCategory(true);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: curatedOverflowIds.map(String), category: 'ARCHIVE' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${curatedOverflowIds.length}개 상품 → 아카이브 이동 완료`);
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          const moveSet = new Set(curatedOverflowIds.map(String));
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                moveSet.has(String(p.originProductNo))
                  ? { ...p, internalCategory: 'ARCHIVE', archiveTier: 'ARCHIVE' }
                  : p
              )
            }
          };
        });
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => { });
      } else {
        toast.error(data.error || '이동 실패');
      }
    } catch (err: any) {
      toast.error('이동 오류: ' + err.message);
    } finally {
      setMovingCategory(false);
    }
  };

  // ARCHIVE 중분류별 초과분 → CLEARANCE 일괄 이동
  const moveArchiveSubOverflow = async (subLabel: string, ids: string[]) => {
    if (ids.length === 0) return;
    setMovingCategory(true);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: ids, category: 'CLEARANCE' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${ids.length}개 상품 → 클리어런스 이동 완료`);
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          const moveSet = new Set(ids);
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                moveSet.has(String(p.originProductNo))
                  ? { ...p, internalCategory: 'CLEARANCE', archiveTier: 'CLEARANCE' }
                  : p
              )
            }
          };
        });
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => { });
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
                if (!selectedIds.includes(String(p.originProductNo))) return p;
                // 라이프사이클 스테이지로 자동 복원
                const stage = p.lifecycle?.stage || 'NEW';
                return { ...p, internalCategory: stage, archiveTier: null };
              })
            }
          };
        });

        // 서버 캐시 무효화
        fetch('/api/smartstore/products?invalidateCache=true').catch(() => { });

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

  // 범용 네이버 전시카테고리 동기화 (모든 스테이지에서 사용)
  const syncExhibition = async (targetCategory?: string) => {
    // 대상 카테고리 결정: 인자로 받거나, 현재 필터 기반
    const category = targetCategory || (stageFilter === 'CLEARANCE' ? 'CLEARANCE' : stageFilter === 'ARCHIVE' ? subFilter : stageFilter);

    // 대상 상품: 선택된 상품 또는 현재 필터의 전체 상품
    let targetIds: string[];
    if (selectedIds.length > 0) {
      targetIds = selectedIds;
    } else if (category === 'NEW') {
      targetIds = products.filter(p => p.internalCategory === 'NEW').map(p => p.originProductNo);
    } else if (category === 'CURATED') {
      targetIds = products.filter(p => p.internalCategory === 'CURATED').map(p => p.originProductNo);
    } else if (category === 'CLEARANCE' || isClearanceCategory(category)) {
      targetIds = products.filter(p => isClearanceCategory(p.internalCategory)).map(p => p.originProductNo);
    } else if (ARCHIVE_SUBS.includes(category)) {
      targetIds = products.filter(p => p.internalCategory === category).map(p => p.originProductNo);
    } else {
      toast.error('동기화할 상품을 선택하거나 카테고리를 지정하세요');
      return;
    }

    if (targetIds.length === 0) {
      toast.error('동기화할 상품이 없습니다');
      return;
    }

    setSyncingDisplay(true);
    setDisplaySyncProgress({ current: 0, total: targetIds.length, message: '동기화 시작...' });

    try {
      const res = await fetch('/api/smartstore/exhibition/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: targetIds, internalCategory: category }),
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
                total: data.total || targetIds.length,
                message: data.message || '',
              });
            }
            if (data.type === 'result' && data.success) {
              toast.success(data.message, { duration: 2000 });
            }
            if (data.type === 'result' && !data.success) {
              toast.error(data.message, { duration: 3000 });
            }
            if (data.type === 'complete') {
              toast.success(data.message);
            }
          } catch { /* parse error */ }
        }
      }
    } catch (err: any) {
      toast.error('동기화 오류: ' + err.message);
    } finally {
      setSyncingDisplay(false);
      setDisplaySyncProgress(null);
      setSelectedIds([]);
    }
  };

  // AI 아카이브 자동 분류 (부모 컴포넌트 팝업으로 위임)
  const handleClassifyAI = () => {
    if (!onClassifyAI || selectedIds.length === 0 || classifyingAI) return;
    const selectedProducts = products
      .filter(p => selectedIds.includes(p.originProductNo))
      .map(p => ({ id: p.originProductNo, name: p.name, imageUrl: p.thumbnailUrl || '' }));
    onClassifyAI(selectedProducts);
    setSelectedIds([]);
    setShowMoveMenu(false);
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('상품코드가 복사되었습니다: ' + text);
  };

  // 선택 상품 코드 대량 복사
  const handleBulkCopy = () => {
    const selected = products.filter(p => selectedIds.includes(p.originProductNo));
    const codes = selected.map(p => p.sellerManagementCode || p.originProductNo).filter(Boolean);
    if (codes.length === 0) {
      toast.error('복사할 상품코드가 없습니다.');
      return;
    }
    const text = codes.join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${codes.length}개 상품코드 복사 완료 (줄바꿈 구분)`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 카테고리 기반 필터링 (메모이제이션)
  const filtered = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return products.filter(p => {
      if (searchTerm) {
        const matchSearch =
          p.name.toLowerCase().includes(searchLower) ||
          p.originProductNo.includes(searchTerm) ||
          (p.sellerManagementCode || '').toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }

      const cat = p.internalCategory || '';

      if (stageFilter === 'ALL') return true;
      if (stageFilter === 'NEW') {
        if (cat !== 'NEW') return false;
        if (newDaysFilter) return (p.lifecycle?.daysSince || 0) >= 30;
        return true;
      }
      if (stageFilter === 'CURATED') {
        if (cat !== 'CURATED') return false;
        if (curatedDaysFilter === -30) return (p.lifecycle?.daysSince || 0) <= 30;
        if (curatedDaysFilter > 0) return (p.lifecycle?.daysSince || 0) >= curatedDaysFilter;
        return true;
      }
      if (stageFilter === 'UNASSIGNED') return !cat || cat === 'UNCATEGORIZED';
      if (stageFilter === 'ARCHIVE') {
        if (!isArchiveCategory(cat)) return false;
        if (archiveDaysFilter && (p.lifecycle?.daysSince || 0) < 120) return false;
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
  }, [products, searchTerm, stageFilter, subFilter, curatedDaysFilter, newDaysFilter, archiveDaysFilter]);

  // 정렬
  const GRADE_ORDER: Record<string, number> = { 'V급': 0, 'S급': 1, 'A급': 2, 'B급': 3, 'C급': 4 };
  const CATEGORY_ORDER: Record<string, number> = {
    'MILITARY': 0, 'MILITARY ARCHIVE': 0,
    'WORKWEAR': 1, 'WORKWEAR ARCHIVE': 1,
    'JAPAN': 2, 'JAPANESE ARCHIVE': 2,
    'HERITAGE': 3, 'HERITAGE EUROPE': 3,
    'BRITISH': 4, 'BRITISH ARCHIVE': 4,
    'UNISEX': 5, 'UNISEX ARCHIVE': 5,
    'OUTDOOR': 6, 'OUTDOOR ARCHIVE': 6,
    'CLEARANCE_KEEP': 7, 'CLEARANCE_DISPOSE': 8,
    'CLEARANCE': 9, 'NEW': 10, 'CURATED': 11, 'UNCATEGORIZED': 12,
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
    setNewDaysFilter(false);
    setArchiveDaysFilter(false);
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
    <div className="space-y-5">
      {/* 검색 */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="상품명, 상품번호, 관리코드 검색..."
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 shadow-sm"
        />
      </div>

      {/* 라이프사이클 스테이지 네비게이션 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex">
          {([
            ['ALL', '전체', stageCounts.ALL],
            ['NEW', '신규 0%', stageCounts.NEW],
            ['CURATED', '큐레이티드 20%', stageCounts.CURATED],
            ['ARCHIVE', '아카이브 40%', stageCounts.ARCHIVE],
            ['CLEARANCE', '클리어런스 70%', stageCounts.CLEARANCE],
            ['UNASSIGNED', '미지정', stageCounts.UNASSIGNED],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => handleStageChange(key)}
              className={`flex-1 py-4 text-center transition-all border-b-2 ${stageFilter === key
                ? 'border-slate-900 bg-slate-50/50'
                : 'border-transparent hover:bg-slate-50/50'
                }`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-wider ${stageFilter === key ? 'text-slate-900' : 'text-slate-400'}`}>
                {label}
              </div>
              <div className={`text-lg font-black leading-none mt-1.5 ${stageFilter === key ? 'text-slate-900' : 'text-slate-600'}`}>
                {count}
              </div>
            </button>
          ))}
        </div>

        {/* NEW 초과 경고 */}
        {newOverflowCount > 0 && (stageFilter === 'ALL' || stageFilter === 'NEW') && (
          <div className="border-t border-amber-200 px-4 py-3 bg-amber-50 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-amber-800 truncate">
              신규 {stageCounts.NEW}개 (제한 {STAGE_LIMIT}) — <span className="text-red-600 font-bold">{newOverflowCount}개 초과</span>
            </span>
            <button
              onClick={moveOverflowToCurated}
              disabled={movingCategory}
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
            >
              {movingCategory ? '이동 중...' : `${newOverflowCount}개 → 큐레이티드`}
            </button>
          </div>
        )}

        {/* NEW 기간별 필터 */}
        {stageFilter === 'NEW' && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setNewDaysFilter(false); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!newDaysFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                전체 {stageCounts.NEW}
              </button>
              <button
                onClick={() => { setNewDaysFilter(true); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${newDaysFilter ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                30일 경과 {newOver30Count}
              </button>
              <span className="w-px h-5 bg-slate-200 self-center" />
              <button
                onClick={() => syncExhibition('NEW')}
                disabled={syncingDisplay}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${syncingDisplay ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
              >
                {syncingDisplay
                  ? `동기화 중... ${displaySyncProgress ? `${displaySyncProgress.current}/${displaySyncProgress.total}` : ''}`
                  : `스마트스토어 상품 전송 ${stageCounts.NEW}`
                }
              </button>
            </div>
            {displaySyncProgress && stageFilter === 'NEW' && (
              <div className="space-y-1 mt-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${displaySyncProgress.total > 0 ? (displaySyncProgress.current / displaySyncProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {displaySyncProgress.message} · <span className="text-orange-600 font-bold underline">전송기록 탭에서 결과 확인 가능</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* CURATED 초과 경고 */}
        {curatedOverflowCount > 0 && (stageFilter === 'ALL' || stageFilter === 'CURATED') && (
          <div className="border-t border-amber-200 px-4 py-3 bg-amber-50 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-amber-800 truncate">
              큐레이티드 {stageCounts.CURATED}개 (제한 {STAGE_LIMIT}) — <span className="text-red-600 font-bold">{curatedOverflowCount}개 초과</span>
            </span>
            <button
              onClick={moveOverflowToArchive}
              disabled={movingCategory}
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
            >
              {movingCategory ? '이동 중...' : `${curatedOverflowCount}개 → 아카이브`}
            </button>
          </div>
        )}

        {/* CURATED 기간별 필터 */}
        {stageFilter === 'CURATED' && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex gap-2 flex-wrap">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${curatedDaysFilter === days ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label} {count}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 self-center" />
              <button
                onClick={() => syncExhibition('CURATED')}
                disabled={syncingDisplay}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${syncingDisplay ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
              >
                {syncingDisplay
                  ? `동기화 중... ${displaySyncProgress ? `${displaySyncProgress.current}/${displaySyncProgress.total}` : ''}`
                  : `스마트스토어 상품 전송 ${stageCounts.CURATED}`
                }
              </button>
            </div>
            {displaySyncProgress && stageFilter === 'CURATED' && (
              <div className="space-y-1 mt-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${displaySyncProgress.total > 0 ? (displaySyncProgress.current / displaySyncProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{displaySyncProgress.message}</p>
              </div>
            )}
          </div>
        )}

        {/* ARCHIVE 중분류별 초과 경고 */}
        {archiveSubOverflows.length > 0 && (stageFilter === 'ALL' || stageFilter === 'ARCHIVE') && (
          <div className="border-t border-amber-200 bg-amber-50 divide-y divide-amber-200">
            {archiveSubOverflows.map(o => (
              <div key={o.sub} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-amber-800 truncate">
                  {o.label} {o.count}개 (제한 {STAGE_LIMIT}) — <span className="text-red-600 font-bold">{o.overflow}개 초과</span>
                </span>
                <button
                  onClick={() => moveArchiveSubOverflow(o.label, o.ids)}
                  disabled={movingCategory}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
                >
                  {movingCategory ? '이동 중...' : `${o.overflow}개 → 클리어런스`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ARCHIVE 세부 카테고리 */}
        {stageFilter === 'ARCHIVE' && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleSubChange('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                전체 {archiveSubCounts.ALL}
              </button>
              {ARCHIVE_SUBS.map(sub => (
                <button
                  key={sub}
                  onClick={() => handleSubChange(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subFilter === sub ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {sub === 'MILITARY ARCHIVE' ? 'Military' : sub === 'WORKWEAR ARCHIVE' ? 'Workwear' : sub === 'OUTDOOR ARCHIVE' ? 'Outdoor' : sub === 'JAPANESE ARCHIVE' ? 'Japan' : sub === 'HERITAGE EUROPE' ? 'Euro Vintage' : sub === 'BRITISH ARCHIVE' ? 'British' : 'Unisex'} {archiveSubCounts[sub]}
                </button>
              ))}
              <button
                onClick={() => handleSubChange('UNASSIGNED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subFilter === 'UNASSIGNED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                미지정 {archiveSubCounts['UNASSIGNED']}
              </button>
              <span className="w-px h-5 bg-slate-200 self-center" />
              <button
                onClick={() => { setArchiveDaysFilter(!archiveDaysFilter); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${archiveDaysFilter ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                120일 경과 {archiveOver120Count}
              </button>
              {archiveSubCounts['UNASSIGNED'] > 0 && (
                <>
                  <span className="w-px h-5 bg-slate-200 self-center" />
                  <button
                    onClick={() => {
                      const unclassifiedIds = products
                        .filter(p => p.internalCategory === 'ARCHIVE')
                        .map(p => p.originProductNo);
                      setSelectedIds(unclassifiedIds);
                      toast.success(`미분류 ${unclassifiedIds.length}개 선택됨 → AI 분류 버튼을 눌러주세요`);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200"
                  >
                    미분류 {archiveSubCounts['UNASSIGNED']}개 선택
                  </button>
                </>
              )}
              {subFilter !== 'ALL' && subFilter !== 'UNASSIGNED' && (
                <>
                  <span className="w-px h-5 bg-slate-200 self-center" />
                  <button
                    onClick={() => syncExhibition(subFilter)}
                    disabled={syncingDisplay}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${syncingDisplay ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
                  >
                    {syncingDisplay
                      ? `동기화 중... ${displaySyncProgress ? `${displaySyncProgress.current}/${displaySyncProgress.total}` : ''}`
                      : `스마트스토어 상품 전송 ${archiveSubCounts[subFilter] || 0}`
                    }
                  </button>
                </>
              )}
            </div>
            {displaySyncProgress && stageFilter === 'ARCHIVE' && (
              <div className="space-y-1 px-4 pb-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${displaySyncProgress.total > 0 ? (displaySyncProgress.current / displaySyncProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{displaySyncProgress.message}</p>
              </div>
            )}
          </div>
        )}

        {/* CLEARANCE 세부 카테고리 */}
        {stageFilter === 'CLEARANCE' && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              {([
                ['ALL', '전체', clearanceSubCounts.ALL],
                ['CLEARANCE', '폐기검토', clearanceSubCounts.CLEARANCE],
                ['CLEARANCE_KEEP', '유지', clearanceSubCounts.CLEARANCE_KEEP],
                ['CLEARANCE_DISPOSE', '폐기', clearanceSubCounts.CLEARANCE_DISPOSE],
              ] as [string, string, number][]).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => handleSubChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subFilter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label} {count}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 self-center" />
              <button
                onClick={() => syncExhibition()}
                disabled={syncingDisplay}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${syncingDisplay ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}
              >
                {syncingDisplay
                  ? `동기화 중... ${displaySyncProgress ? `${displaySyncProgress.current}/${displaySyncProgress.total}` : ''}`
                  : `스마트스토어 상품 전송 ${clearanceSubCounts.ALL}`
                }
              </button>
            </div>
            {displaySyncProgress && (
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${displaySyncProgress.total > 0 ? (displaySyncProgress.current / displaySyncProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{displaySyncProgress.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 선택 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg ring-1 ring-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedIds([]); setShowMoveMenu(false); }} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <span className="text-sm font-medium">선택됨 <span className="text-white font-black">{selectedIds.length}</span></span>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={handleBulkCopy}
                className="px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors bg-white/10 text-white/80 hover:bg-white/20"
              >
                상품코드 복사
              </button>
              {stageFilter === 'ARCHIVE' && (
                <>
                  <button
                    type="button"
                    onClick={() => moveToCategory('CLEARANCE')}
                    disabled={movingCategory}
                    className="px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600"
                  >
                    {movingCategory ? '이동 중...' : '클리어런스 이동'}
                  </button>
                  <button
                    onClick={() => syncExhibition()}
                    disabled={syncingDisplay}
                    className={`px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors ${syncingDisplay ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                  >
                    {syncingDisplay ? '동기화 중...' : '네이버 전시카테고리'}
                  </button>
                </>
              )}
              {stageFilter === 'CLEARANCE' && (
                <>
                  <button
                    type="button"
                    onClick={() => moveToCategory('CLEARANCE_KEEP')}
                    disabled={movingCategory}
                    className="px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    {movingCategory ? '이동 중...' : '유지'}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveToCategory('CLEARANCE_DISPOSE')}
                    disabled={movingCategory}
                    className="px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors bg-red-500 text-white hover:bg-red-600"
                  >
                    {movingCategory ? '이동 중...' : '폐기'}
                  </button>
                  <button
                    onClick={() => syncExhibition()}
                    disabled={syncingDisplay}
                    className={`px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors ${syncingDisplay ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                  >
                    {syncingDisplay ? '동기화 중...' : '네이버 전시카테고리'}
                  </button>
                </>
              )}
              <button
                onClick={handleClassifyAI}
                disabled={classifyingAI || movingCategory || !onClassifyAI}
                className={`px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors ${classifyingAI ? 'bg-violet-500 text-white animate-pulse' : 'bg-violet-500 text-white hover:bg-violet-600'}`}
              >
                {classifyingAI ? 'AI 분류 중...' : 'AI 분류'}
              </button>
              <button
                onClick={() => resetToAuto()}
                disabled={movingCategory || classifyingAI}
                className="px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                {movingCategory ? '처리 중...' : '분류 취소'}
              </button>
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                disabled={movingCategory || classifyingAI}
                className={`px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors ${showMoveMenu ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
              >
                {movingCategory ? '이동 중...' : '카테고리 이동'}
              </button>
            </div>
          </div>

          {/* 카테고리 선택 메뉴 */}
          {showMoveMenu && !classifyingAI && (
            <div className="border-t border-white/10 pt-3 space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">아카이브</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {['MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE', 'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => moveToCategory(cat)}
                      disabled={movingCategory}
                      className="px-2 py-2.5 text-[10px] font-semibold bg-white/5 text-white/70 rounded-lg hover:bg-white/15 hover:text-white transition-colors text-center leading-tight"
                    >
                      {cat === 'MILITARY ARCHIVE' ? 'Military' : cat === 'WORKWEAR ARCHIVE' ? 'Workwear' : cat === 'OUTDOOR ARCHIVE' ? 'Outdoor' : cat === 'JAPANESE ARCHIVE' ? 'Japan' : cat === 'HERITAGE EUROPE' ? 'Euro Vintage' : cat === 'BRITISH ARCHIVE' ? 'British' : 'Unisex'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">클리어런스</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {['CLEARANCE', 'CLEARANCE_KEEP', 'CLEARANCE_DISPOSE'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => moveToCategory(cat)}
                      disabled={movingCategory}
                      className="px-2 py-2.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors"
                    >
                      {cat === 'CLEARANCE' ? '폐기검토' : cat === 'CLEARANCE_KEEP' ? '유지' : '폐기'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">기타</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => moveToCategory('NEW')} disabled={movingCategory}
                    className="px-2 py-2.5 text-[10px] font-semibold bg-white/5 text-emerald-400 rounded-lg hover:bg-white/15 transition-colors">신규</button>
                  <button onClick={() => moveToCategory('CURATED')} disabled={movingCategory}
                    className="px-2 py-2.5 text-[10px] font-semibold bg-white/5 text-indigo-400 rounded-lg hover:bg-white/15 transition-colors">큐레이티드</button>
                  <button onClick={() => resetToAuto()} disabled={movingCategory}
                    className="px-2 py-2.5 text-[10px] font-semibold bg-white/5 text-red-400 rounded-lg hover:bg-white/15 transition-colors">자동복원</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 정렬 + 뷰모드 + 결과 수 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500">{sorted.length.toLocaleString()}개</span>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
            className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900/20 outline-none shadow-sm"
          >
            <option value="date_desc">최신순</option>
            <option value="date_asc">오래된순</option>
            <option value="category">카테고리별</option>
            <option value="grade">등급순 (V→B)</option>
            <option value="price_desc">가격 높은순</option>
            <option value="price_asc">가격 낮은순</option>
            <option value="confidence">신뢰도순</option>
          </select>
          {onSyncGrades && (
            <button
              onClick={onSyncGrades}
              disabled={syncingGrades}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 ${syncingGrades ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncingGrades ? '등급 동기화 중...' : '등급 동기화'}
              </div>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="목록 보기"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="카드 보기"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {[50, 100, 300, 500].map(size => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-md transition-all ${pageSize === size ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 뷰 */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3.5 text-left">상품코드</th>
                <th className="px-1 py-3.5 w-10"></th>
                <th className="px-3 py-3.5 text-left">상품명</th>
                <th className="px-3 py-3.5 text-left">브랜드</th>
                <th className="px-3 py-3.5 text-right">소비자가</th>
                <th className="px-3 py-3.5 text-right">판매가</th>
                <th className="px-3 py-3.5 text-center">등급</th>
                <th className="px-3 py-3.5 text-center">등록일</th>
                <th className="px-3 py-3.5 text-center">경과일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {paginatedItems.map(p => {
                const isSelected = selectedIds.includes(p.originProductNo);
                const discountRate = p.lifecycle?.discountRate || 0;
                const hasDiscount = discountRate > 0 && p.lifecycle?.stage !== 'NEW';
                const discountedPrice = hasDiscount ? Math.round(p.salePrice * (1 - discountRate / 100)) : p.salePrice;

                // 경과일 기반 배경색: 빨간색 경고
                const days = p.lifecycle?.daysSince || 0;
                const cat = p.internalCategory || '';
                const isOverdue =
                  (cat === 'NEW' && days >= 30) ||
                  (cat === 'CURATED' && days >= 60) ||
                  (isArchiveCategory(cat) && days >= 120);
                const rowBgStyle = isOverdue && !isSelected
                  ? { backgroundColor: `rgba(239, 68, 68, ${Math.min((days - (cat === 'NEW' ? 30 : cat === 'CURATED' ? 60 : 120)) / 60, 1) * 0.12 + 0.06})` }
                  : undefined;

                return (
                  <tr
                    key={p.originProductNo}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-slate-100/60' : ''}`}
                    style={rowBgStyle}
                    onClick={() => toggleSelect(p.originProductNo)}
                  >
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.originProductNo)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-mono font-bold text-violet-600 whitespace-nowrap">
                        {p.sellerManagementCode || '-'}
                      </span>
                    </td>
                    <td className="px-1 py-2">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                        {p.thumbnailUrl ? (
                          <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-[7px] font-bold">이미지</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                        {p.classification?.brand || extractBrand(p.name)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-[10px] font-bold whitespace-nowrap ${hasDiscount ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {p.salePrice?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
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
                    <td className="px-3 py-2.5 text-center">
                      {(() => {
                        const vg = p.classification?.visionGrade;
                        const dg = p.descriptionGrade;
                        const grade = vg || (dg ? `${dg}급` : null);
                        if (!grade) return <span className="text-[9px] text-slate-300">-</span>;
                        return (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black leading-none ${grade.startsWith('S') ? 'bg-yellow-100 text-yellow-700' :
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
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[9px] text-slate-500 whitespace-nowrap">
                        {p.regDate ? new Date(p.regDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] font-bold ${(p.lifecycle?.daysSince || 0) > 120 ? 'text-red-500' :
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
        <div className="space-y-3">
          {paginatedItems.map((p, idx) => (
            <div
              key={p.originProductNo}
              className={`group bg-white rounded-2xl border p-4 hover:shadow-lg transition-all cursor-pointer ag-card ${idx % 5 === 0 ? 'ag-float-1' : idx % 5 === 1 ? 'ag-float-2' : idx % 5 === 2 ? 'ag-float-3' : idx % 5 === 3 ? 'ag-float-4' : 'ag-float-5'
                } ${selectedIds.includes(p.originProductNo) ? 'border-slate-400 ring-1 ring-slate-400 bg-slate-50/40' : 'border-slate-100'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelect(p.originProductNo);
              }}
            >
              <div className="flex gap-4">
                {/* 이미지 */}
                <div className="w-18 h-18 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-bold">이미지</div>
                  )}
                </div>

                {/* 상품 정보 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div
                        className="flex items-center gap-1.5 group/copy cursor-copy"
                        onClick={(e) => handleCopy(e, p.originProductNo)}
                        title="클릭하여 복사"
                      >
                        <span className="text-[10px] font-mono font-bold text-slate-400 group-hover/copy:text-slate-700 transition-colors">
                          #{p.originProductNo}
                        </span>
                        <svg className="w-2.5 h-2.5 text-slate-300 group-hover/copy:text-slate-700 opacity-0 group-hover/copy:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${p.internalCategory === 'UNCATEGORIZED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'
                        }`}>
                        {p.internalCategory === 'NEW' ? '신규' : p.internalCategory === 'CURATED' ? '큐레이티드' : p.internalCategory === 'ARCHIVE' ? '아카이브' : p.internalCategory === 'CLEARANCE' ? '폐기검토' : p.internalCategory === 'CLEARANCE_KEEP' ? '유지' : p.internalCategory === 'CLEARANCE_DISPOSE' ? '폐기' : p.internalCategory === 'MILITARY ARCHIVE' ? 'Military' : p.internalCategory === 'WORKWEAR ARCHIVE' ? 'Workwear' : p.internalCategory === 'OUTDOOR ARCHIVE' ? 'Outdoor' : p.internalCategory === 'JAPANESE ARCHIVE' ? 'Japan' : p.internalCategory === 'HERITAGE EUROPE' ? 'Euro Vintage' : p.internalCategory === 'BRITISH ARCHIVE' ? 'British' : p.internalCategory === 'UNISEX ARCHIVE' ? 'Unisex' : p.internalCategory === 'UNCATEGORIZED' ? '미분류' : p.internalCategory || '미지정'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {p.sellerManagementCode ? (
                        <span className="text-[10px] font-mono font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-100">
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
                    <p className="font-bold text-sm text-slate-900 line-clamp-1 leading-tight mb-2">{p.name}</p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {p.lifecycle && p.lifecycle.discountRate > 0 && p.lifecycle.stage !== 'NEW' ? (
                      <>
                        <span className="text-[11px] font-bold text-slate-400 line-through">{p.salePrice?.toLocaleString()}</span>
                        <span className="text-[13px] font-extrabold text-red-600">
                          {Math.round(p.salePrice * (1 - p.lifecycle.discountRate / 100)).toLocaleString()}원
                        </span>
                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-1 py-px rounded">-{p.lifecycle.discountRate}%</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-extrabold text-slate-800">{p.salePrice?.toLocaleString()}원</span>
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
                        {p.lifecycle.stage === 'NEW' ? '신규' : p.lifecycle.stage === 'CURATED' ? '큐레이티드' : p.lifecycle.stage === 'ARCHIVE' ? '아카이브' : '클리어런스'}
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
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      상세
                    </button>
                  </div>
                </div>
              </div>

              {/* AI 다차원 분류 결과 */}
              {p.classification && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 rounded-xl p-3 space-y-2.5">
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
        <div className="flex items-center justify-center gap-3 py-10">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="flex items-center gap-1.5">
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
                  className={`min-w-[36px] h-9 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
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
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 ag-float-1 ag-card">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p className="text-sm font-semibold text-slate-400">
            {searchTerm ? '검색 결과가 없습니다.' :
              stageFilter === 'UNASSIGNED' ? '미지정 상품이 없습니다.' :
                stageFilter === 'NEW' ? '신규 상품이 없습니다.' :
                  stageFilter === 'CURATED' ? '큐레이티드 상품이 없습니다.' :
                    stageFilter === 'ARCHIVE' ? '아카이브 상품이 없습니다.' :
                      stageFilter === 'CLEARANCE' ? '클리어런스 상품이 없습니다.' :
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
