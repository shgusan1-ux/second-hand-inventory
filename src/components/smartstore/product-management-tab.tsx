'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProductAnalysisDetail } from './product-analysis-detail';
import { calculateSalesScore } from '@/lib/smartstore-rank';
import { getMarketWeather } from '@/lib/weather';
import { ArchiveManagementModal } from './archive-management-modal';
import { useArchiveSettings, type ArchiveCategory } from '@/hooks/use-archive-settings';

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

export interface AIClassifySettings {
  model: 'flash' | 'pro';
  threshold: number;
  skipClassified: boolean;
  weights: { ai: number; brand: number; image: number; keyword: number; context: number };
}

interface ProductManagementTabProps {
  products: Product[];
  onRefresh: () => void;
  onSyncGrades?: () => void;
  syncingGrades?: boolean;
  onClassifyAI?: (products: { id: string; name: string; imageUrl: string }[], settings: AIClassifySettings) => void;
  classifyingAI?: boolean;
  onSyncExhibition?: (category: string, ids: string[]) => Promise<void>;
  syncingDisplay?: boolean;
}

// 검수 이슈 레이블
function auditIssueLabel(code: string): string {
  const labels: Record<string, string> = {
    IMAGE_BROKEN: '엑박',
    IMAGE_DUPLICATE: '이미지중복',
    NAME_MISMATCH: '명칭불일치',
    NAME_TYPO: '명칭오타',
    IMAGE_MISMATCH: '이미지불일치',
    NO_DETAIL: '상세없음',
    NO_GRADE: '등급없음',
    NO_THUMBNAIL: '썸네일없음',
    PRICE_ZERO: '가격0원',
    SCAN_ERROR: '스캔오류',
  };
  return labels[code] || code;
}

// 상품명에서 브랜드 추출: 한글 나오기 전까지 영문+특수문자 부분
function extractBrand(name: string): string {
  // "DOLCE&GABBANA 다크블루..." → "DOLCE&GABBANA"
  // "URBAN RESEARCH 어반 리서치..." → "URBAN RESEARCH"
  // "POLO RALPH LAUREN 폴로..." → "POLO RALPH LAUREN"
  const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
  return match ? match[1].trim() : name.split(' ')[0];
}

export function ProductManagementTab({ products, onRefresh, onSyncGrades, syncingGrades = false, onClassifyAI, classifyingAI = false, onSyncExhibition, syncingDisplay = false }: ProductManagementTabProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTemp, setCurrentTemp] = useState<number>(20);

  // 실시간 날씨/온도 가져오기
  useEffect(() => {
    getMarketWeather().then(weather => {
      setCurrentTemp(weather.averageTemp);
    }).catch(() => {
      // 기본값 20도 유지
    });
  }, []);

  // 검수 결과 로드
  useEffect(() => {
    fetch('/api/smartstore/products/audit')
      .then(r => r.json())
      .then(data => {
        if (data.results) {
          const map = new Map<string, string[]>();
          data.results.forEach((r: any) => {
            try {
              const issues = typeof r.issues === 'string' ? JSON.parse(r.issues) : r.issues;
              if (issues.length > 0) map.set(r.origin_product_no, issues);
            } catch { /* skip */ }
          });
          setAuditResults(map);
        }
        setAuditLoaded(true);
      })
      .catch(() => setAuditLoaded(true));
  }, []);

  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [movingCategory, setMovingCategory] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [displaySyncProgress, setDisplaySyncProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [issueFilter, setIssueFilter] = useState<'NONE' | 'MISSING_GRADE' | 'MISSING_BADGE' | 'MISSING_IMAGE' | 'MISSING_BOTH'>('NONE');
  const [updatingGradeId, setUpdatingGradeId] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountProgress, setDiscountProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [rebalancing, setRebalancing] = useState(false);

  // 검수(Audit) 관련 상태
  const [auditResults, setAuditResults] = useState<Map<string, string[]>>(new Map());
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [auditSubFilter, setAuditSubFilter] = useState<string>('ALL');
  const scanAbortRef = useRef<AbortController | null>(null);

  // 카테고리 네비게이션
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [subFilter, setSubFilter] = useState<string>('ALL');
  const [curatedDaysFilter, setCuratedDaysFilter] = useState<number>(0); // 0=전체, 30, 60, 90
  const [newDaysFilter, setNewDaysFilter] = useState<boolean>(false); // true=30일 경과만
  const [archiveDaysFilter, setArchiveDaysFilter] = useState<boolean>(false); // true=120일 경과만
  const [showArchiveSettings, setShowArchiveSettings] = useState(false);

  const { categories: archiveCategories, updateCategory, refresh: refreshArchiveSettings } = useArchiveSettings();
  const ARCHIVE_SUBS = useMemo(() => archiveCategories.map((c: ArchiveCategory) => c.category_id), [archiveCategories]);
  const isArchiveCategory = (cat?: string) => cat === 'ARCHIVE' || ARCHIVE_SUBS.includes(cat || '');
  const isClearanceCategory = (cat?: string) => cat === 'CLEARANCE' || cat === 'CLEARANCE_KEEP' || cat === 'CLEARANCE_DISPOSE';

  // 모든 카운트를 1회 순회로 통합 계산
  const { stageCounts, archiveSubCounts, curatedDaysCounts, clearanceSubCounts, newOver30Count, archiveOver120Count, clearanceOver120Count } = useMemo(() => {
    const stage = { ALL: products.length, NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0, UNASSIGNED: 0 };
    const archive: Record<string, number> = { ALL: 0, UNASSIGNED: 0 };
    ARCHIVE_SUBS.forEach((s: string) => { archive[s] = 0; });
    const curated = { ALL: 0, under30: 0, d30: 0, d60: 0, d90: 0 };
    const clearance: Record<string, number> = { ALL: 0, CLEARANCE: 0, CLEARANCE_KEEP: 0, CLEARANCE_DISPOSE: 0 };
    let newOver30 = 0;
    let archiveOver120 = 0;
    let clearanceOver120 = 0;

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
        if (days >= 120) clearanceOver120++;
      } else {
        stage.UNASSIGNED++;
      }
    }

    return { stageCounts: stage, archiveSubCounts: archive, curatedDaysCounts: curated, clearanceSubCounts: clearance, newOver30Count: newOver30, archiveOver120Count: archiveOver120, clearanceOver120Count: clearanceOver120 };
  }, [products, ARCHIVE_SUBS]);

  // 각 카테고리 200개 제한 (유지가치 점수 낮은 상품부터 다음 단계로 이동)
  const STAGE_LIMIT = 200;
  const newOverflowCount = Math.max(0, stageCounts.NEW - STAGE_LIMIT);
  const curatedOverflowCount = Math.max(0, stageCounts.CURATED - STAGE_LIMIT);

  // 유지가치 점수: 선호브랜드(35%) + 가격(30%) + 등급(25%) + 신선도(10%)
  // 빈티지 시장 수요 기반 — 점수 낮은 상품부터 다음 단계로 이동
  const POPULAR_BRANDS: Record<string, number> = {
    // S티어 (35점): 빈티지 시장 최고 인기 브랜드 (리셀가 높음)
    'BURBERRY': 35, 'BARBOUR': 35, 'STONE ISLAND': 35, 'CP COMPANY': 35,
    'PATAGONIA': 35, 'ARC\'TERYX': 35, 'ARCTERYX': 35,
    'COMME DES GARCONS': 35, 'ISSEY MIYAKE': 35, 'YOHJI YAMAMOTO': 35,
    'POLO RALPH LAUREN': 35, 'RALPH LAUREN': 35, 'RRL': 35,
    'RED WING': 35, 'LEVI\'S': 35, 'LEVIS': 35, 'SCHOTT': 35,
    'THE REAL MCCOY\'S': 35, 'REAL MCCOYS': 35, 'BUZZ RICKSON': 35,
    'FILSON': 35, 'NIGEL CABOURN': 35,
    // A티어 (26점): 높은 인기
    'CARHARTT': 26, 'THE NORTH FACE': 26, 'NORTH FACE': 26,
    'STUSSY': 26, 'CHAMPION': 26, 'NIKE': 26, 'ADIDAS': 26,
    'FRED PERRY': 26, 'LACOSTE': 26, 'BEN SHERMAN': 26,
    'COLUMBIA': 26, 'L.L.BEAN': 26, 'LL BEAN': 26, 'PENDLETON': 26,
    'DICKIES': 26, 'TIMBERLAND': 26, 'WRANGLER': 26, 'LEE': 26,
    'WOOLRICH': 26, 'SIERRA DESIGNS': 26, 'HELLY HANSEN': 26,
    'DANTON': 26, 'ORSLOW': 26, 'KAPITAL': 26, 'VISVIM': 26,
    'ENGINEERED GARMENTS': 26, 'BEAMS': 26,
    // B티어 (17점): 보통 인기
    'GAP': 17, 'EDDIE BAUER': 17, 'LANDS END': 17, 'BANANA REPUBLIC': 17,
    'J.CREW': 17, 'BROOKS BROTHERS': 17, 'TOMMY HILFIGER': 17,
    'NAUTICA': 17, 'HANES': 17, 'RUSSELL': 17,
    'UNIQLO': 17, 'ZARA': 17, 'H&M': 17,
    'NEW BALANCE': 17, 'PUMA': 17, 'REEBOK': 17, 'CONVERSE': 17,
  };

  const keepScore = (p: Product, categoryProducts: Product[]): number => {
    // 1. 선호브랜드 점수 (35점 만점): 시장 수요 기반
    const brandName = (p.classification?.brand || extractBrand(p.name)).toUpperCase();
    let brandScore = POPULAR_BRANDS[brandName] || 0;
    // 브랜드 티어 fallback (선호목록에 없는 경우)
    if (brandScore === 0) {
      const tier = p.classification?.brandTier || '';
      const tierFallback: Record<string, number> = { 'LUXURY': 30, 'PREMIUM': 20, 'MID': 10, 'BASIC': 4 };
      brandScore = tierFallback[tier] || 0;
    }

    // 2. 가격 점수 (30점 만점): 카테고리 내 상대 순위
    const prices = categoryProducts.map(cp => cp.salePrice).sort((a, b) => a - b);
    const priceRank = prices.indexOf(p.salePrice);
    const priceScore = prices.length > 1 ? Math.round((priceRank / (prices.length - 1)) * 30) : 15;

    // 3. 등급 점수 (25점 만점): V=25, S=19, A=12, B=5, 미등급=0
    const grade = p.classification?.visionGrade || p.descriptionGrade || '';
    const gradeMap: Record<string, number> = { 'V': 25, 'V급': 25, 'S': 19, 'S급': 19, 'A': 12, 'A급': 12, 'B': 5, 'B급': 5 };
    const gradeScore = gradeMap[grade] || 0;

    // 4. 신선도 점수 (10점 만점): 최근 등록일수록 높음
    const days = p.lifecycle?.daysSince || 0;
    const freshScore = Math.max(0, Math.round((1 - Math.min(days, 180) / 180) * 10));

    return brandScore + priceScore + gradeScore + freshScore;
  };

  // 아카이브: 중분류별 200개 제한
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
        const subProducts = products.filter(p => p.internalCategory === sub);
        const ids = subProducts
          .sort((a, b) => keepScore(a, subProducts) - keepScore(b, subProducts))
          .slice(0, overflow).map(p => p.originProductNo);
        overflows.push({ sub, label: labelMap[sub] || sub, count: subCount, overflow, ids });
      }
    }
    return overflows;
  }, [products, archiveSubCounts, ARCHIVE_SUBS]);

  const newOverflowIds = useMemo(() => {
    if (newOverflowCount <= 0) return [];
    const newProducts = products.filter(p => p.internalCategory === 'NEW');
    return newProducts
      .sort((a, b) => keepScore(a, newProducts) - keepScore(b, newProducts))
      .slice(0, newOverflowCount).map(p => p.originProductNo);
  }, [products, newOverflowCount]);

  const curatedOverflowIds = useMemo(() => {
    if (curatedOverflowCount <= 0) return [];
    const curatedProducts = products.filter(p => p.internalCategory === 'CURATED');
    return curatedProducts
      .sort((a, b) => keepScore(a, curatedProducts) - keepScore(b, curatedProducts))
      .slice(0, curatedOverflowCount).map(p => p.originProductNo);
  }, [products, curatedOverflowCount]);

  // 클리어런스 120일 경과 → 폐기 이동 대상 ID
  const clearanceOver120Ids = useMemo(() => {
    if (clearanceOver120Count <= 0) return [];
    return products
      .filter(p => isClearanceCategory(p.internalCategory) && (p.lifecycle?.daysSince || 0) >= 120)
      .map(p => p.originProductNo);
  }, [products, clearanceOver120Count]);

  // 클리어런스 120일 경과 → 폐기(CLEARANCE_DISPOSE) 일괄 이동
  const moveClearanceToDispose = async () => {
    if (clearanceOver120Ids.length === 0) return;
    setMovingCategory(true);
    try {
      const res = await fetch('/api/smartstore/products/category/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNos: clearanceOver120Ids, category: 'CLEARANCE_DISPOSE' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${clearanceOver120Ids.length}개 상품 → 폐기 이동 완료`);
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          const moveSet = new Set(clearanceOver120Ids.map(String));
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                moveSet.has(String(p.originProductNo))
                  ? { ...p, internalCategory: 'CLEARANCE_DISPOSE', archiveTier: 'CLEARANCE_DISPOSE' }
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
    if (!onSyncExhibition) return;

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

    try {
      await onSyncExhibition(category, targetIds);
      setSelectedIds([]);
    } catch (err) {
      // 에러는 onSyncExhibition에서 toast로 처리됨
    }
  };

  // AI 분류 설정 패널
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiSettings, setAiSettings] = useState<AIClassifySettings>({
    model: 'flash',
    threshold: 25,
    skipClassified: true,
    weights: { ai: 40, brand: 35, image: 10, keyword: 10, context: 5 },
  });

  const handleClassifyAI = () => {
    if (!onClassifyAI || selectedIds.length === 0 || classifyingAI) return;
    setShowAISettings(true); // 설정 패널 먼저 표시
  };

  const startClassifyAI = () => {
    if (!onClassifyAI) return;
    const selectedProducts = products
      .filter(p => selectedIds.includes(p.originProductNo))
      .map(p => ({ id: p.originProductNo, name: p.name, imageUrl: p.thumbnailUrl || '' }));
    onClassifyAI(selectedProducts, aiSettings);
    setSelectedIds([]);
    setShowMoveMenu(false);
    setShowAISettings(false);
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

  // 카테고리별 전체 상품코드 복사
  const copyAllCodes = (filterFn: (p: Product) => boolean, label: string) => {
    const codes = products.filter(filterFn).map(p => p.sellerManagementCode || p.originProductNo).filter(Boolean);
    if (codes.length === 0) {
      toast.error('복사할 상품코드가 없습니다.');
      return;
    }
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success(`${label} ${codes.length}개 상품코드 복사 완료`);
  };

  // 카테고리별 즉시할인 적용 (네이버 스마트스토어 가격 동기화)
  const applyDiscount = async (filterFn: (p: Product) => boolean, discountRate: number, label: string) => {
    const targets = products.filter(filterFn);
    if (targets.length === 0) {
      toast.error('적용할 상품이 없습니다.');
      return;
    }

    if (!confirm(`${label} ${targets.length}개 상품에 즉시할인 ${discountRate}%를 적용합니다.\n네이버 스마트스토어에 반영됩니다. 계속하시겠습니까?`)) return;

    setApplyingDiscount(true);
    setDiscountProgress({ current: 0, total: targets.length, message: '즉시할인 적용 시작...' });

    try {
      const items = targets.map(p => ({
        originProductNo: p.originProductNo,
        discountRate,
      }));

      const res = await fetch('/api/smartstore/products/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!res.body) throw new Error('SSE 스트림 없음');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let success = 0;
      let failed = 0;

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
            if (event.type === 'item_complete') {
              if (event.result?.success) success++;
              else failed++;
              setDiscountProgress({
                current: success + failed,
                total: targets.length,
                message: event.result?.changes?.[0] || `${success + failed}/${targets.length}`,
              });
            }
            if (event.type === 'complete') {
              toast.success(`즉시할인 적용 완료: ${success}개 성공, ${failed}개 실패`);
            }
          } catch { /* parse error */ }
        }
      }
    } catch (err: any) {
      toast.error('즉시할인 적용 오류: ' + err.message);
    } finally {
      setApplyingDiscount(false);
      setDiscountProgress(null);
    }
  };

  // 전체 재배치: keepScore 기반으로 카테고리 200개 제한 적용
  const rebalanceAll = async () => {
    if (!confirm('전체 상품을 keepScore 기반으로 재배치합니다.\n\n• NEW/CURATED: 각 200개 (점수 높은 상품 유지)\n• ARCHIVE: 서브카테고리별 200개\n• 나머지 → CLEARANCE\n\n계속하시겠습니까?')) return;

    setRebalancing(true);
    try {
      const res = await fetch('/api/smartstore/products/rebalance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const s = data.summary;
        const moveDetails = Object.entries(s.moves || {}).map(([k, v]) => `  ${k}: ${v}개`).join('\n');
        toast.success(`재배치 완료: ${s.moved}개 이동\n${moveDetails}`);
        // 캐시 무효화 + 리프레시
        await fetch('/api/smartstore/products?invalidateCache=true');
        onRefresh();
      } else {
        toast.error(data.error || '재배치 실패');
      }
    } catch (err: any) {
      toast.error('재배치 오류: ' + err.message);
    } finally {
      setRebalancing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleUpdateGrade = async (id: string, grade: string) => {
    setUpdatingGradeId(id);
    try {
      const res = await fetch('/api/smartstore/products/grade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originProductNo: id, grade })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`등급 업데이트 완료: ${grade}급`);
        queryClient.setQueryData(['all-products'], (old: any) => {
          if (!old?.data?.contents) return old;
          return {
            ...old,
            data: {
              ...old.data,
              contents: old.data.contents.map((p: any) =>
                p.originProductNo === id ? { ...p, descriptionGrade: grade } : p
              )
            }
          };
        });
      } else {
        toast.error(data.error || '등급 업데이트 실패');
      }
    } catch (err: any) {
      toast.error('오류: ' + err.message);
    } finally {
      setUpdatingGradeId(null);
    }
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
      if (stageFilter === 'KIDS') {
        return cat === 'KIDS';
      }
      if (stageFilter === 'AUDIT') {
        const issues = auditResults.get(p.originProductNo);
        if (!issues || issues.length === 0) return false;
        if (auditSubFilter === 'ALL') return true;
        return issues.includes(auditSubFilter);
      }

      if (issueFilter !== 'NONE') {
        const hasThumbnail = !!p.thumbnailUrl;
        const hasGrade = !!(p.classification?.visionGrade || p.descriptionGrade);
        const isBadgeSynced = p.thumbnailUrl?.includes('/thumbnails/generated/') || p.thumbnailUrl?.includes('vercel-storage.com');

        if (issueFilter === 'MISSING_GRADE' && hasGrade) return false;
        if (issueFilter === 'MISSING_BADGE') {
          if (!hasGrade || !hasThumbnail || isBadgeSynced) return false;
        }
        if (issueFilter === 'MISSING_IMAGE' && hasThumbnail) return false;
        if (issueFilter === 'MISSING_BOTH' && (hasThumbnail || hasGrade)) return false;
      }

      return true;
    });
  }, [products, searchTerm, stageFilter, subFilter, curatedDaysFilter, newDaysFilter, archiveDaysFilter, issueFilter, ARCHIVE_SUBS, auditResults, auditSubFilter]);

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
      case 'sales_score':
        return arr.sort((a, b) => calculateSalesScore(b as any, currentTemp) - calculateSalesScore(a as any, currentTemp));
      default:
        return arr;
    }
  }, [filtered, sortBy, currentTemp]);

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
    setAuditSubFilter('ALL');
    setCuratedDaysFilter(0);
    setNewDaysFilter(false);
    setArchiveDaysFilter(false);
    setCurrentPage(1);
  };

  const handleSubChange = (sub: string) => {
    setSubFilter(sub);
    setCurrentPage(1);
  };

  // 딥 스캔 실행 (배치 자동 연속)
  const startAuditScan = async (force = false) => {
    if (scanning) return;
    const abortController = new AbortController();
    scanAbortRef.current = abortController;
    setScanning(true);
    setScanProgress({ current: 0, total: 0, message: force ? '전체 재스캔 시작...' : '스캔 시작...' });

    const newResults = new Map<string, string[]>();
    let currentOffset = 0;
    let hasMore = true;
    const forceParam = force ? '&force=true' : '';

    try {
      while (hasMore && !abortController.signal.aborted) {
        const res = await fetch(`/api/smartstore/products/audit?offset=${currentOffset}${forceParam}`, {
          method: 'POST',
          signal: abortController.signal,
        });
        const reader = res.body?.getReader();
        if (!reader) throw new Error('스트림 읽기 실패');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || abortController.signal.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'start') {
                setScanProgress({ current: currentOffset, total: event.total, message: `배치 ${Math.floor(currentOffset / 150) + 1} 스캔 중...` });
              } else if (event.type === 'progress') {
                setScanProgress({ current: event.current, total: event.total, message: event.message });
                if (event.issues?.length > 0) {
                  newResults.set(event.productNo, event.issues);
                }
                // 실시간 업데이트 (캐시 항목은 10건마다, 신규는 매번)
                if (!event.skipped || event.current % 10 === 0) {
                  setAuditResults(new Map(newResults));
                }
              } else if (event.type === 'complete') {
                hasMore = event.hasMore === true;
                currentOffset = event.nextOffset || currentOffset;
                setScanProgress({ current: event.hasMore ? currentOffset : event.total, total: event.total, message: event.message });
                if (!event.hasMore) {
                  toast.success(event.message);
                }
              } else if (event.type === 'error') {
                toast.error(event.message);
                hasMore = false;
              }
            } catch { /* JSON parse error */ }
          }
        }
      }

      setAuditResults(new Map(newResults));
      if (abortController.signal.aborted) {
        toast.success(`스캔 중단됨 (${newResults.size}개 문제 발견)`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(`스캔 실패: ${err.message}`);
      }
    } finally {
      scanAbortRef.current = null;
      setScanning(false);
      setTimeout(() => setScanProgress(null), 3000);
    }
  };

  const stopAuditScan = () => {
    scanAbortRef.current?.abort();
  };

  // 개별 상품 재확인
  const recheckProduct = async (productNo: string) => {
    const loadingId = toast.loading(`${productNo} 재확인 중...`);
    try {
      const res = await fetch('/api/smartstore/products/audit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNo }),
      });
      const data = await res.json();
      toast.dismiss(loadingId);

      if (data.success) {
        setAuditResults(prev => {
          const next = new Map(prev);
          if (data.issues.length > 0) {
            next.set(productNo, data.issues);
            toast.error(`${productNo}: 아직 ${data.issues.length}건 문제 (${data.issues.map((i: string) => auditIssueLabel(i)).join(', ')})`);
          } else {
            next.delete(productNo);
            toast.success(`${productNo}: 문제 없음! 정상 확인됨`);
          }
          return next;
        });
      } else {
        toast.error(`재확인 실패: ${data.error}`);
      }
    } catch (err: any) {
      toast.dismiss(loadingId);
      toast.error(`재확인 오류: ${err.message}`);
    }
  };

  // 검수 결과 엑셀 다운로드
  const downloadAuditExcel = () => {
    if (auditResults.size === 0) return;
    const rows: string[][] = [['상품코드', '상품명', '검수내용']];
    for (const [productNo, issues] of auditResults) {
      const product = products.find(p => p.originProductNo === productNo);
      const name = product?.name || '';
      const issueText = issues.map(i => auditIssueLabel(i)).join(', ');
      rows.push([productNo, name, issueText]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `검수결과_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <button
          onClick={() => {
            const nextMap: any = { NONE: 'MISSING_GRADE', MISSING_GRADE: 'MISSING_BADGE', MISSING_BADGE: 'MISSING_IMAGE', MISSING_IMAGE: 'MISSING_BOTH', MISSING_BOTH: 'NONE' };
            setIssueFilter(nextMap[issueFilter]);
            setCurrentPage(1);
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${issueFilter !== 'NONE' ? 'bg-rose-500 text-white border-rose-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
        >
          {issueFilter === 'NONE' ? '정보 누락 필터' :
            issueFilter === 'MISSING_GRADE' ? '등급 누락' :
              issueFilter === 'MISSING_BADGE' ? '뱃지 누락' :
                issueFilter === 'MISSING_IMAGE' ? '이미지 누락' : '이미지+등급 누락'}
        </button>
      </div>

      {/* 라이프사이클 스테이지 네비게이션 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-3 sm:flex divide-x divide-y sm:divide-y-0 divide-slate-100">
          {([
            ['ALL', '전체', stageCounts.ALL],
            ['NEW', '신규 0%', stageCounts.NEW],
            ['CURATED', '큐레이티드', stageCounts.CURATED],
            ['ARCHIVE', '아카이브', stageCounts.ARCHIVE],
            ['CLEARANCE', '클리어런스', stageCounts.CLEARANCE],
            ['UNASSIGNED', '미지정', stageCounts.UNASSIGNED],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => handleStageChange(key)}
              className={`flex-1 py-3 sm:py-4 text-center transition-all ${stageFilter === key
                ? 'bg-slate-900 text-white'
                : 'hover:bg-slate-50/50 text-slate-400'
                }`}
            >
              <div className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${stageFilter === key ? 'text-white/70' : 'text-slate-400'}`}>
                {label === '큐레이티드' && stageFilter !== key ? '큐레이티드 20%' :
                  label === '아카이브' && stageFilter !== key ? '아카이브 40%' :
                    label === '클리어런스' && stageFilter !== key ? '클리어런스 70%' : label}
              </div>
              <div className={`text-base sm:text-lg font-black leading-none mt-1 ${stageFilter === key ? 'text-white' : 'text-slate-600'}`}>
                {count}
              </div>
            </button>
          ))}
          {/* 검수필요 버튼 */}
          <button
            onClick={() => handleStageChange('AUDIT')}
            className={`flex-1 py-3 sm:py-4 text-center transition-all ${stageFilter === 'AUDIT'
              ? 'bg-red-600 text-white'
              : auditResults.size > 0 ? 'bg-red-50 hover:bg-red-100 text-red-500' : 'hover:bg-slate-50/50 text-slate-400'
              }`}
          >
            <div className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${stageFilter === 'AUDIT' ? 'text-white/80' : auditResults.size > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              검수필요
            </div>
            <div className={`text-base sm:text-lg font-black leading-none mt-1 ${stageFilter === 'AUDIT' ? 'text-white' : auditResults.size > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {auditResults.size}
            </div>
          </button>
        </div>

        {/* 전체 재배치 버튼 */}
        {stageFilter === 'ALL' && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              keepScore 기반 재배치 (선호브랜드 35% + 가격 30% + 등급 25% + 신선도 10%)
            </span>
            <button
              onClick={rebalanceAll}
              disabled={rebalancing}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ${rebalancing ? 'bg-violet-500 text-white animate-pulse' : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95'}`}
            >
              {rebalancing ? '재배치 중...' : '전체 재배치'}
            </button>
          </div>
        )}

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
                onClick={() => copyAllCodes(p => p.internalCategory === 'NEW', '신규')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                전체 상품코드 복사 {stageCounts.NEW}
              </button>
            </div>
            {discountProgress && stageFilter === 'NEW' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${discountProgress.total > 0 ? (discountProgress.current / discountProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{discountProgress.message}</p>
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
                onClick={() => copyAllCodes(p => p.internalCategory === 'CURATED', '큐레이티드')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                전체 상품코드 복사 {stageCounts.CURATED}
              </button>
              <button
                onClick={() => applyDiscount(p => p.internalCategory === 'CURATED', 20, '큐레이티드')}
                disabled={applyingDiscount}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${applyingDiscount ? 'bg-blue-500 text-white animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
              >
                {applyingDiscount && stageFilter === 'CURATED' ? '적용 중...' : '즉시할인 20% 송신'}
              </button>
            </div>
            {discountProgress && stageFilter === 'CURATED' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${discountProgress.total > 0 ? (discountProgress.current / discountProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{discountProgress.current}/{discountProgress.total} {discountProgress.message}</p>
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
              {ARCHIVE_SUBS.map((sub: string) => {
                const label = archiveCategories.find(c => c.category_id === sub)?.display_name || sub;
                return (
                  <div key={sub} className="flex items-center gap-1">
                    <button
                      onClick={() => handleSubChange(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subFilter === sub ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {label} {archiveSubCounts[sub]}
                    </button>
                    {archiveSubCounts[sub] > 0 && (
                      <button
                        onClick={() => copyAllCodes(p => p.internalCategory === sub, label)}
                        className="px-1.5 py-1.5 rounded-md text-[9px] font-bold transition-all bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-700 border border-slate-200"
                        title={`${label} 상품코드 전체 복사`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
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
              <span className="w-px h-5 bg-slate-200 self-center" />
              <button
                onClick={() => applyDiscount(p => isArchiveCategory(p.internalCategory), 40, '아카이브')}
                disabled={applyingDiscount}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${applyingDiscount && stageFilter === 'ARCHIVE' ? 'bg-amber-500 text-white animate-pulse' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'}`}
              >
                {applyingDiscount && stageFilter === 'ARCHIVE' ? '적용 중...' : '즉시할인 40% 송신'}
              </button>
            </div>
            {discountProgress && stageFilter === 'ARCHIVE' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${discountProgress.total > 0 ? (discountProgress.current / discountProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{discountProgress.current}/{discountProgress.total} {discountProgress.message}</p>
              </div>
            )}
            <button
              onClick={() => setShowArchiveSettings(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 border-dashed hover:border-emerald-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              아카이브 카테고리 및 브랜드 마스터 설정
            </button>
          </div>
        )}

        {/* CLEARANCE 세부 카테고리 */}
        {stageFilter === 'CLEARANCE' && (
          <div className="border-t border-slate-100 px-4 py-3">
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
                onClick={() => applyDiscount(p => isClearanceCategory(p.internalCategory), 70, '클리어런스')}
                disabled={applyingDiscount}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${applyingDiscount && stageFilter === 'CLEARANCE' ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
              >
                {applyingDiscount && stageFilter === 'CLEARANCE' ? '적용 중...' : '즉시할인 70% 송신'}
              </button>
              {clearanceOver120Count > 0 && (
                <>
                  <span className="w-px h-5 bg-slate-200 self-center" />
                  <span className="text-[10px] font-bold text-red-600">120일+ {clearanceOver120Count}개</span>
                  <button
                    onClick={moveClearanceToDispose}
                    disabled={movingCategory}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-600 text-white hover:bg-red-700 active:scale-95 disabled:opacity-50"
                  >
                    {movingCategory ? '이동 중...' : `${clearanceOver120Count}개 → 폐기`}
                  </button>
                </>
              )}
            </div>
            {discountProgress && stageFilter === 'CLEARANCE' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-red-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${discountProgress.total > 0 ? (discountProgress.current / discountProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 truncate">{discountProgress.current}/{discountProgress.total} {discountProgress.message}</p>
              </div>
            )}
          </div>
        )}

        {/* 검수필요 서브 패널 */}
        {stageFilter === 'AUDIT' && (
          <div className="border-t border-red-200 px-4 py-3 bg-red-50/50 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-red-800">
                  {auditResults.size > 0 ? `${auditResults.size}개 문제 상품 발견` : '스캔 결과 없음'}
                </span>
                {auditLoaded && !scanning && (
                  <>
                    <button
                      onClick={() => startAuditScan(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all"
                    >
                      딥 스캔
                    </button>
                    <button
                      onClick={() => startAuditScan(true)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 active:scale-95 transition-all"
                    >
                      전체 재스캔
                    </button>
                  </>
                )}
                {scanning && (
                  <button
                    onClick={stopAuditScan}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-900 active:scale-95 transition-all"
                  >
                    스캔 중단
                  </button>
                )}
                {auditResults.size > 0 && !scanning && (
                  <button
                    onClick={downloadAuditExcel}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
                  >
                    엑셀 다운로드
                  </button>
                )}
              </div>
            </div>
            {scanProgress && (
              <div className="space-y-1">
                <div className="w-full bg-red-100 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-red-600 truncate">{scanProgress.current}/{scanProgress.total} {scanProgress.message}</p>
              </div>
            )}
            {auditResults.size > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {([
                  ['ALL', '전체', auditResults.size],
                  ...Object.entries(
                    Array.from(auditResults.values()).flat().reduce((acc, issue) => {
                      acc[issue] = (acc[issue] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([key, count]) => [key, auditIssueLabel(key), count])
                ] as [string, string, number][]).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setAuditSubFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${auditSubFilter === key ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}
                  >
                    {label} {count}
                  </button>
                ))}
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
                <button
                  type="button"
                  onClick={() => moveToCategory('CLEARANCE')}
                  disabled={movingCategory}
                  className="px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600"
                >
                  {movingCategory ? '이동 중...' : '클리어런스 이동'}
                </button>
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
                </>
              )}
              {stageFilter !== 'CLEARANCE' && (
                <button
                  onClick={handleClassifyAI}
                  disabled={classifyingAI || movingCategory || !onClassifyAI}
                  className={`px-3.5 py-2 text-xs rounded-lg font-semibold transition-colors ${classifyingAI ? 'bg-violet-500 text-white animate-pulse' : 'bg-violet-500 text-white hover:bg-violet-600'}`}
                >
                  {classifyingAI ? 'AI 분류 중...' : 'AI 분류'}
                </button>
              )}
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

          {/* AI 분류 설정 패널 — 5개 프리셋 */}
          {showAISettings && !classifyingAI && (() => {
            const presets: { key: string; name: string; desc: string; icon: string; settings: AIClassifySettings }[] = [
              {
                key: 'balanced', name: '균형', desc: 'AI+브랜드+이미지 골고루', icon: '⚖️',
                settings: { model: 'flash', threshold: 25, skipClassified: true, weights: { ai: 40, brand: 35, image: 10, keyword: 10, context: 5 } }
              },
              {
                key: 'brand', name: '브랜드 중심', desc: '브랜드 DB를 최우선', icon: '🏷️',
                settings: { model: 'flash', threshold: 20, skipClassified: true, weights: { ai: 25, brand: 50, image: 5, keyword: 15, context: 5 } }
              },
              {
                key: 'ai-pro', name: 'AI 정밀', desc: 'Pro 모델로 정확하게', icon: '🧠',
                settings: { model: 'pro', threshold: 25, skipClassified: true, weights: { ai: 55, brand: 25, image: 10, keyword: 5, context: 5 } }
              },
              {
                key: 'aggressive', name: '공격적', desc: '낮은 임계값, 최대한 분류', icon: '🔥',
                settings: { model: 'flash', threshold: 15, skipClassified: true, weights: { ai: 45, brand: 30, image: 10, keyword: 10, context: 5 } }
              },
              {
                key: 'conservative', name: '보수적', desc: '높은 확신만 분류', icon: '🛡️',
                settings: { model: 'pro', threshold: 40, skipClassified: true, weights: { ai: 35, brand: 35, image: 15, keyword: 10, context: 5 } }
              },
            ];
            const selectedPreset = presets.find(p =>
              p.settings.model === aiSettings.model && p.settings.threshold === aiSettings.threshold
            )?.key || 'balanced';
            return (
              <div className="border-t border-violet-500/20 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-violet-400">AI 분류 모드</p>
                  <span className="text-[10px] text-white/40">{selectedIds.length}개 선택됨</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {presets.map(p => (
                    <button key={p.key}
                      onClick={() => setAiSettings(p.settings)}
                      className={`px-1.5 py-2.5 rounded-xl text-center transition-all ${selectedPreset === p.key
                        ? 'bg-violet-600 text-white ring-2 ring-violet-400/50 shadow-lg shadow-violet-500/20'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                      <div className="text-base mb-0.5">{p.icon}</div>
                      <div className="text-[10px] font-bold leading-tight">{p.name}</div>
                      <div className="text-[8px] text-white/40 mt-0.5 leading-tight">{p.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/30">
                  <span>모델: <b className="text-white/60">{aiSettings.model === 'pro' ? 'Pro' : 'Flash'}</b></span>
                  <span>임계값: <b className="text-white/60">{aiSettings.threshold}</b></span>
                  <span>기분류: <b className="text-white/60">{aiSettings.skipClassified ? '스킵' : '재분류'}</b></span>
                  <button onClick={() => setAiSettings(s => ({ ...s, skipClassified: !s.skipClassified }))}
                    className="ml-auto text-[9px] text-violet-400 hover:text-violet-300">
                    {aiSettings.skipClassified ? '재분류로 전환' : '스킵으로 전환'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAISettings(false)}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-white/5 text-white/50 rounded-lg hover:bg-white/10">
                    취소
                  </button>
                  <button onClick={startClassifyAI}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors">
                    {selectedIds.length}개 분류 시작
                  </button>
                </div>
              </div>
            );
          })()}
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
            <option value="sales_score">판매지수(Score) 순</option>
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
                <th className="px-3 py-3.5 text-left">스토어코드</th>
                <th className="px-3 py-3.5 text-right">소비자가</th>
                <th className="px-3 py-3.5 text-right">할인가</th>
                <th className="px-3 py-3.5 text-center">등급</th>
                <th className="px-3 py-3.5 text-center">등록일</th>
                <th className="px-3 py-3.5 text-center">경과일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {paginatedItems.map(p => {
                const isSelected = selectedIds.includes(p.originProductNo);
                // 카테고리 기반 고정 할인율: NEW=0%, CURATED=20%, ARCHIVE=40%, CLEARANCE=70%
                const cat2 = p.internalCategory || '';
                const discountRate = cat2 === 'CURATED' ? 20 : isArchiveCategory(cat2) ? 40 : isClearanceCategory(cat2) ? 70 : 0;
                const hasDiscount = discountRate > 0;
                const discountedPrice = hasDiscount ? Math.round(p.salePrice * (1 - discountRate / 100)) : p.salePrice;
                const discountAmount = hasDiscount ? p.salePrice - discountedPrice : 0;

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
                    <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                      {p.channelProductNo ? (
                        <a
                          href={`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-9 h-9 rounded-lg overflow-hidden bg-slate-50 shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                          onClick={e => { e.preventDefault(); window.open(`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`, '_blank'); }}
                        >
                          {p.thumbnailUrl ? (
                            <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[7px] font-bold">이미지</div>
                          )}
                        </a>
                      ) : (
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                          {p.thumbnailUrl ? (
                            <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[7px] font-bold">이미지</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[260px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0 flex-1">
                          {p.channelProductNo ? (
                            <a
                              href={`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-slate-800 truncate leading-tight block hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                              onClick={e => { e.preventDefault(); window.open(`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`, '_blank'); }}
                            >
                              {p.name}
                            </a>
                          ) : (
                            <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                          )}
                        </div>
                        {(auditResults.has(p.originProductNo) || stageFilter === 'AUDIT') && (
                          <div className="flex gap-0.5 shrink-0 items-center">
                            {auditResults.get(p.originProductNo)?.slice(0, 2).map(issue => (
                              <span key={issue} className="px-1 py-0.5 bg-red-100 text-red-600 text-[8px] font-bold rounded whitespace-nowrap">
                                {auditIssueLabel(issue)}
                              </span>
                            ))}
                            {(auditResults.get(p.originProductNo)?.length || 0) > 2 && (
                              <span className="px-1 py-0.5 bg-red-100 text-red-600 text-[8px] font-bold rounded">
                                +{auditResults.get(p.originProductNo)!.length - 2}
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); recheckProduct(p.originProductNo); }}
                              className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-bold rounded hover:bg-blue-200 transition-colors whitespace-nowrap"
                              title="이 상품을 재확인합니다"
                            >
                              재확인
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                        {p.classification?.brand || extractBrand(p.name)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {p.channelProductNo ? (
                        <a
                          href={`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                        >
                          {p.channelProductNo}
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-[10px] font-bold whitespace-nowrap ${hasDiscount ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {p.salePrice?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {hasDiscount ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-extrabold text-red-600 whitespace-nowrap">
                            {discountedPrice.toLocaleString()}원
                          </span>
                          <span className="text-[9px] font-bold text-red-500 whitespace-nowrap">
                            -{discountRate}% (-{discountAmount.toLocaleString()})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                          {p.salePrice?.toLocaleString()}원
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      {(() => {
                        const vg = p.classification?.visionGrade;
                        const dg = p.descriptionGrade;
                        const grade = vg || (dg ? (dg.endsWith('급') ? dg : `${dg}급`) : null);

                        if (!grade) {
                          return (
                            <div className="flex items-center justify-center gap-1">
                              {['V', 'S', 'A', 'B'].map(g => (
                                <button
                                  key={g}
                                  onClick={() => handleUpdateGrade(p.originProductNo, g)}
                                  disabled={updatingGradeId === p.originProductNo}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all border border-slate-200 hover:border-slate-900 disabled:opacity-50"
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          );
                        }
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
                    {p.channelProductNo ? (
                      <a
                        href={`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sm text-slate-900 line-clamp-1 leading-tight mb-2 block hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                        onClick={e => { e.stopPropagation(); e.preventDefault(); window.open(`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`, '_blank'); }}
                      >
                        {p.name}
                      </a>
                    ) : (
                      <p className="font-bold text-sm text-slate-900 line-clamp-1 leading-tight mb-2">{p.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {(() => {
                      const cardCat = p.internalCategory || '';
                      const cardDiscount = cardCat === 'CURATED' ? 20 : isArchiveCategory(cardCat) ? 40 : isClearanceCategory(cardCat) ? 70 : 0;
                      const cardDiscountedPrice = cardDiscount > 0 ? Math.round(p.salePrice * (1 - cardDiscount / 100)) : p.salePrice;
                      return cardDiscount > 0 ? (
                        <>
                          <span className="text-[11px] font-bold text-slate-400 line-through">{p.salePrice?.toLocaleString()}</span>
                          <span className="text-[13px] font-extrabold text-red-600">
                            {cardDiscountedPrice.toLocaleString()}원
                          </span>
                          <span className="text-[10px] font-black text-red-500 bg-red-50 px-1 py-px rounded">-{cardDiscount}%</span>
                        </>
                      ) : (
                        <span className="text-[13px] font-extrabold text-slate-800">{p.salePrice?.toLocaleString()}원</span>
                      );
                    })()}
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
      {/* 아카이브 설정 모달 */}
      <ArchiveManagementModal
        open={showArchiveSettings}
        onClose={() => setShowArchiveSettings(false)}
        onRefresh={() => {
          refreshArchiveSettings();
          onRefresh();
        }}
      />
    </div>
  );
}
