'use client';

import { useEffect, useState, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import { toast, Toaster } from 'sonner';
import { generateProductDetailHTML } from '@/lib/product-detail-generator';
import { processImageWithBadge, preloadBackgroundRemoval } from '@/lib/image-processor';

interface ProductData {
    id: string;
    name: string;
    brand: string;
    category: string;
    category_name?: string;
    price_consumer: number;
    price_sell: number;
    status: string;
    condition: string;
    size: string;
    fabric: string;
    image_url: string;
    images: string;
    md_comment: string;
    master_reg_date: string;
    category_classification?: string;
    edit_completed?: number;
    status_ai?: string;
}

interface DraftData {
    name: string;
    brand: string;
    category: string;
    price_consumer: number;
    price_sell: number;
    status: string;
    condition: string;
    size: string;
    fabric: string;
    md_comment: string;
    master_reg_date: string;
    images: string[];
    customHTML?: string;
}

interface CategoryItem {
    id: string;
    name: string;
    sort_order: number;
    classification?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AIResult {
    suggestedName: string;
    suggestedBrand: string;
    suggestedSize: string;
    suggestedFabric: string;
    suggestedCategory: string;
    suggestedGender: string;
    suggestedConsumerPrice: number;
    grade: string;
    gradeReason: string;
    suggestedPrice: number;
    priceReason: string;
    mdDescription: string;
    confidence: number;
    vibe?: string;
    stylingTips?: string;
}

export default function ProductEditorPage() {
    const [products, setProducts] = useState<ProductData[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Map<string, DraftData>>(new Map());
    const [saveStatuses, setSaveStatuses] = useState<Map<string, SaveStatus>>(new Map());
    const [hasDraft, setHasDraft] = useState<Set<string>>(new Set());
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [fittingImage, setFittingImage] = useState<string | null>(null);
    const [isFitting, setIsFitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<AIResult | null>(null);
    const [aiChecked, setAiChecked] = useState<Set<string>>(new Set());
    const [formKey, setFormKey] = useState(0);
    const [isBadgeProcessing, setIsBadgeProcessing] = useState(false);
    const [badgePreview, setBadgePreview] = useState<string | null>(null);
    const [originalImage0, setOriginalImage0] = useState<string | null>(null); // 뱃지 적용 전 원본 이미지 백업
    const [isMDGenerating, setIsMDGenerating] = useState(false);
    const [mdGeneratedText, setMdGeneratedText] = useState<string | null>(null);
    const [mdInserted, setMdInserted] = useState(false); // MD 삽입 완료 여부
    const [fittingAsThumbnailDone, setFittingAsThumbnailDone] = useState(false); // 착용샷 → 썸네일 적용 완료
    const [fittingAsImageDone, setFittingAsImageDone] = useState(false); // 착용샷 → 이미지 추가 완료
    const [aiApplied, setAiApplied] = useState(false); // AI 선택 적용 완료 여부
    const [mdMoodImage, setMdMoodImage] = useState<string | null>(null); // MD 무드이미지 URL
    const [isMoodImageGenerating, setIsMoodImageGenerating] = useState(false);
    const [mdMoodImageInserted, setMdMoodImageInserted] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false); // 오타 교정 중 상태
    const [isEstimatingSize, setIsEstimatingSize] = useState(false); // 사이즈 추정 중
    const [supplierData, setSupplierData] = useState<Map<string, any>>(new Map());
    const [isSupplierLoading, setIsSupplierLoading] = useState(false);
    const [selectedGender, setSelectedGender] = useState<string>(''); // 대분류: MAN/WOMAN/KIDS/UNISEX
    const [fittingModel, setFittingModel] = useState<'flash' | 'pro'>('flash'); // 착용샷 AI 모델
    const [fittingCustomPrompt, setFittingCustomPrompt] = useState(''); // 착용샷 수정 요청
    const [zoomImage, setZoomImage] = useState<string | null>(null); // 이미지 확대 모달
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; status: string } | null>(null); // 전체 AI 배치 진행
    const [backgroundProgress, setBackgroundProgress] = useState<Map<string, 'processing' | 'done' | 'error'>>(new Map()); // 배경 작업 진행 상태
    const backgroundProcessingRef = useRef<Set<string>>(new Set()); // 현재 배경 작업 중인 ID들
    const batchAbortRef = useRef(false); // 배치 중단 플래그
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview'); // 새 상세페이지 미리보기 모드
    const [autoMode, setAutoMode] = useState(false); // 자동 AI 워크플로우 on/off (기본 OFF)
    const autoWorkflowRef = useRef<string | null>(null); // 현재 자동 워크플로우 진행 중인 상품 ID
    const autoAbortRef = useRef<AbortController | null>(null); // 자동 워크플로우 API 중단용
    const originalProductsRef = useRef<Map<string, string[]>>(new Map()); // 에디터 진입 시 원본 이미지 보관

    // cleanup: 디바운스 타이머 해제 + 좌우 스크롤 방지 + 단축키 등록
    useEffect(() => {
        preloadBackgroundRemoval(); // WASM 모델 사전 로드
        // 모바일 좌우 스크롤 완전 차단
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (selectedId) handleEditComplete(selectedId);
            }
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                handleAIAnalyze();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            document.documentElement.style.overflowX = '';
            document.body.style.overflowX = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedId]);

    // 상품 + 카테고리 로드
    useEffect(() => {
        const data = sessionStorage.getItem('product-editor-data');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                setProducts(parsed);
                if (parsed.length > 0) setSelectedId(parsed[0].id);
                // 원본 이미지 보관 (초기화용)
                for (const p of parsed) {
                    try {
                        const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                        if (Array.isArray(imgs) && imgs.length > 0) {
                            originalProductsRef.current.set(p.id, imgs.filter(Boolean));
                        } else if (p.image_url) {
                            originalProductsRef.current.set(p.id, p.image_url.split(',').map((s: string) => s.trim()).filter(Boolean));
                        }
                    } catch { }
                }
            } catch { }
            sessionStorage.removeItem('product-editor-data');
        }
        // 카테고리 (inventory-table에서 전달 → 없으면 API fallback)
        const catData = sessionStorage.getItem('product-editor-categories');
        if (catData) {
            try {
                const parsed = JSON.parse(catData);
                if (parsed.length > 0 && parsed[0].classification) {
                    setCategories(parsed);
                } else {
                    // classification 필드 누락 → API에서 다시 가져오기
                    fetchCategoriesFromAPI();
                }
            } catch {
                fetchCategoriesFromAPI();
            }
            sessionStorage.removeItem('product-editor-categories');
        } else {
            fetchCategoriesFromAPI();
        }

        async function fetchCategoriesFromAPI() {
            try {
                const res = await fetch('/api/inventory/categories');
                const json = await res.json();
                if (json.success && json.data) {
                    setCategories(json.data);
                }
            } catch { }
        }
    }, []);

    // localStorage draft 로드
    useEffect(() => {
        if (products.length === 0) return;
        const newDrafts = new Map<string, DraftData>();
        const draftSet = new Set<string>();
        for (const p of products) {
            const saved = localStorage.getItem(`product-draft-${p.id}`);
            if (saved) {
                try {
                    newDrafts.set(p.id, JSON.parse(saved));
                    draftSet.add(p.id);
                } catch { }
            }
        }
        if (newDrafts.size > 0) {
            setDrafts(newDrafts);
            setHasDraft(draftSet);
        }
    }, [products]);

    // 선택한 상품의 카테고리에 맞춰 성별(대분류) 자동 동기화
    useEffect(() => {
        if (!selectedId || categories.length === 0) return;
        const draft = drafts.get(selectedId);
        const product = products.find(p => p.id === selectedId);
        const currentCatId = draft?.category || product?.category;

        if (currentCatId) {
            const cat = categories.find(c => String(c.id) === String(currentCatId));
            if (cat?.classification) {
                setSelectedGender(cat.classification);
            }
        }
    }, [selectedId, categories, drafts, products]);

    // 선택된 상품
    const selectedProduct = useMemo(() =>
        products.find(p => p.id === selectedId) || null
        , [products, selectedId]);

    // 공급사 원본 데이터 자동 조회
    useEffect(() => {
        if (!selectedProduct) return;
        if (supplierData.has(selectedProduct.id)) return; // 이미 조회됨
        const brand = selectedProduct.brand;
        const name = selectedProduct.name;
        setIsSupplierLoading(true);
        const params = new URLSearchParams();
        params.set('id', selectedProduct.id); // product_code 직접 매칭용
        if (brand) params.set('brand', brand);
        if (name) params.set('name', name);
        if (selectedProduct.size) params.set('size', selectedProduct.size);
        fetch(`/api/admin/supplier/match?${params}`)
            .then(r => r.json())
            .then(data => {
                if (data.matched && data.data) {
                    setSupplierData(prev => new Map(prev).set(selectedProduct.id, data.data));
                }
            })
            .catch(() => { })
            .finally(() => setIsSupplierLoading(false));
    }, [selectedProduct, supplierData]);

    // 현재 상품의 공급사 데이터
    const currentSupplier = selectedId ? supplierData.get(selectedId) : null;

    // 공급사 기본원칙 사이즈 + 이미지 자동 적용 (AI 적용 전 기본값)
    useEffect(() => {
        if (!selectedId) return;
        const supplier = supplierData.get(selectedId);
        if (!supplier) return;
        const product = products.find(p => p.id === selectedId);
        if (!product) return;
        const draft = drafts.get(selectedId) || getCurrentDraft(product);

        // 사이즈가 비어있을 때만 공급사 라벨사이즈 자동 적용
        if (supplier.labeled_size) {
            const currentSize = draft.size || product.size;
            if (!currentSize) {
                updateDraft(selectedId, 'size', supplier.labeled_size);
                setFormKey(k => k + 1);
            }
        }

        // 공급사 이미지 자동 병합 (에디터 이미지가 1개 이하이고 공급사에 이미지가 있을 때)
        if (supplier.image_urls) {
            try {
                const supplierImages: string[] = JSON.parse(supplier.image_urls).filter(Boolean);
                if (supplierImages.length > 0 && draft.images.filter(Boolean).length <= 1) {
                    const currentImages = draft.images.filter(Boolean);
                    const mergedImages = [...currentImages];
                    for (const img of supplierImages) {
                        if (!mergedImages.includes(img)) {
                            mergedImages.push(img);
                        }
                    }
                    // 라벨 이미지도 추가
                    if (supplier.label_image) {
                        const labelImgs = supplier.label_image.split('|').map((u: string) => u.trim()).filter(Boolean);
                        for (const img of labelImgs) {
                            if (!mergedImages.includes(img)) {
                                mergedImages.push(img);
                            }
                        }
                    }
                    if (mergedImages.length > currentImages.length) {
                        updateDraft(selectedId, 'images', mergedImages);
                        setFormKey(k => k + 1);
                    }
                }
            } catch { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, supplierData]);

    // 카테고리 ID → 이름 변환 헬퍼 (AI 요청 시 이름으로 전달용)
    const getCategoryDisplayName = useCallback((categoryValue: string) => {
        if (!categoryValue) return '';
        const cat = categories.find(c => c.id === categoryValue);
        return cat ? cat.name : categoryValue; // ID 매칭 시 이름, 아니면 원본 그대로
    }, [categories]);

    // 카테고리 유사어 매칭 (성별 고려 - KIDS/MAN/WOMAN 구분)
    const matchCategory = useCallback((suggested: string, gender?: string) => {
        if (!suggested) return null;
        // 성별 → classification 매핑
        const genderToClass: Record<string, string> = {
            'MAN': 'MAN', 'WOMAN': 'WOMAN', 'KIDS': 'KIDS', 'UNISEX': 'MAN',
        };
        const targetClass = gender ? genderToClass[gender] || 'MAN' : '';

        // 성별 필터링 함수: 같은 이름이 여러 성별에 있을 때 정확한 것을 찾기
        const findWithGender = (predicate: (c: any) => boolean) => {
            const candidates = categories.filter(predicate);
            if (candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];
            // 성별 일치하는 것 우선
            if (targetClass) {
                const genderMatch = candidates.find(c => c.classification === targetClass);
                if (genderMatch) return genderMatch;
            }
            // 남성(MAN)을 기본값으로 (UNKNOWN/UNISEX 대응)
            return candidates.find(c => c.classification === 'MAN') || candidates[0];
        };

        // 1. 정확히 일치 (성별 고려)
        let matched = findWithGender(c => c.name === suggested);
        if (matched) return matched;
        // 2. 부분 포함
        matched = findWithGender(c => c.name.includes(suggested) || suggested.includes(c.name));
        if (matched) return matched;
        // 3. 동의어 매핑
        const synonyms: Record<string, string[]> = {
            '팬츠': ['바지', '팬츠', '슬랙스', '트라우저'],
            '데님팬츠': ['청바지', '진', '데님', '데님팬츠'],
            '티셔츠': ['티셔츠', '반팔', '반팔티'],
            '맨투맨': ['맨투맨', '스웻셔츠', '크루넥'],
            '후드집업/후리스': ['후드티', '후디', '후드집업', '후리스', '플리스'],
            '후드/맨투맨': ['후드맨투맨', '후드 맨투맨'],
            '아우터': ['점퍼', '자켓', '아우터', '외투'],
            '재킷': ['자켓', '재킷', '쟈켓'],
            '악세사리': ['악세서리', '액세서리', '악세사리'],
            '벨트 및 기타': ['벨트', '기타'],
            '머플러,스카프,행거치프': ['머플러', '스카프', '목도리'],
        };
        for (const [catName, words] of Object.entries(synonyms)) {
            if (words.some(w => suggested.includes(w) || w.includes(suggested))) {
                matched = findWithGender(c => c.name === catName);
                if (matched) return matched;
            }
        }
        return null;
    }, [categories]);

    // 이미지 파싱 헬퍼
    const parseImages = useCallback((product: ProductData): string[] => {
        try {
            const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch { }
        return product.image_url ? product.image_url.split(',').map(s => s.trim()).filter(Boolean) : [];
    }, []);

    // 현재 draft 가져오기 (없으면 원본에서 생성)
    const getCurrentDraft = useCallback((product: ProductData): DraftData => {
        const existing = drafts.get(product.id);
        if (existing) return existing;
        return {
            name: product.name || '',
            brand: product.brand || '',
            category: product.category || '',
            price_consumer: product.price_consumer || 0,
            price_sell: product.price_sell || 0,
            status: product.status || '판매중',
            condition: product.condition || '',
            size: product.size || '',
            fabric: product.fabric || '',
            md_comment: product.md_comment || '',
            master_reg_date: product.master_reg_date || '',
            images: parseImages(product),
            customHTML: (product as any).customHTML || '',
        };
    }, [drafts, parseImages]);

    // 디바운스용 ref (텍스트 입력 최적화)
    const pendingDraftRef = useRef<Map<string, Record<string, any>>>(new Map());
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 기본 draft 생성 헬퍼
    const createDefaultDraft = useCallback((product: ProductData): DraftData => ({
        name: product.name || '',
        brand: product.brand || '',
        category: product.category || '',
        price_consumer: product.price_consumer || 0,
        price_sell: product.price_sell || 0,
        status: product.status || '판매중',
        condition: product.condition || '',
        size: product.size || '',
        fabric: product.fabric || '',
        md_comment: product.md_comment || '',
        master_reg_date: product.master_reg_date || '',
        images: parseImages(product),
        customHTML: (product as any).customHTML || '',
    }), [parseImages]);

    // pending 업데이트를 state에 반영
    const flushPendingDrafts = useCallback(() => {
        if (pendingDraftRef.current.size === 0) return;
        const pendingSnapshot = new Map(pendingDraftRef.current);
        pendingDraftRef.current.clear();
        setDrafts(prev => {
            const next = new Map(prev);
            for (const [id, changes] of pendingSnapshot) {
                const product = products.find(p => p.id === id);
                if (!product) continue;
                const current = prev.get(id) || createDefaultDraft(product);
                next.set(id, { ...current, ...changes });
            }
            return next;
        });
    }, [products, createDefaultDraft]);

    // Draft 즉시 업데이트 (select, 버튼 등 즉각 반영 필요한 경우)
    const updateDraft = useCallback((id: string, field: string, value: any) => {
        // pending에도 반영 (save 시 누락 방지)
        const existing = pendingDraftRef.current.get(id) || {};
        existing[field] = value;
        pendingDraftRef.current.set(id, existing);
        // 즉시 state에도 반영
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushPendingDrafts();
    }, [flushPendingDrafts]);

    // Draft 디바운스 업데이트 (텍스트 입력용 - 300ms 지연)
    const updateDraftDebounced = useCallback((id: string, field: string, value: any) => {
        const existing = pendingDraftRef.current.get(id) || {};
        existing[field] = value;
        pendingDraftRef.current.set(id, existing);
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(flushPendingDrafts, 300);
    }, [flushPendingDrafts]);

    // 저장 (pending 디바운스 데이터 병합)
    const handleSave = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        // pending 업데이트 병합
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        let draft = getCurrentDraft(product);
        const pending = pendingDraftRef.current.get(id);
        if (pending) {
            draft = { ...draft, ...pending } as DraftData;
            pendingDraftRef.current.delete(id);
        }
        flushPendingDrafts();

        setSaveStatuses(prev => new Map(prev).set(id, 'saving'));
        try {
            const res = await fetch('/api/inventory/products/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...draft }),
            });
            if (res.ok) {
                setSaveStatuses(prev => new Map(prev).set(id, 'saved'));
                localStorage.removeItem(`product-draft-${id}`);
                setHasDraft(prev => { const next = new Set(prev); next.delete(id); return next; });
                // 원본 상품 데이터도 업데이트
                setProducts(prev => prev.map(p => p.id === id ? {
                    ...p, ...draft,
                    image_url: draft.images[0] || '',
                    images: JSON.stringify(draft.images),
                } : p));
                toast.success(`${draft.name} 저장 완료`);
                // 1개 상품이면 저장 후 창 닫기 (여러 개면 계속 작업)
                if (products.length === 1) {
                    setTimeout(() => window.close(), 800);
                }
            } else {
                const data = await res.json();
                setSaveStatuses(prev => new Map(prev).set(id, 'error'));
                toast.error(`저장 실패: ${data.error}`);
            }
        } catch (err: any) {
            setSaveStatuses(prev => new Map(prev).set(id, 'error'));
            toast.error(`저장 오류: ${err.message}`);
        }
    };

    // 수정완료 처리 (저장 + edit_completed 마킹)
    const handleEditComplete = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        let draft = getCurrentDraft(product);
        const pending = pendingDraftRef.current.get(id);
        if (pending) {
            draft = { ...draft, ...pending } as DraftData;
            pendingDraftRef.current.delete(id);
        }
        flushPendingDrafts();

        setSaveStatuses(prev => new Map(prev).set(id, 'saving'));
        try {
            const res = await fetch('/api/inventory/products/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...draft, edit_completed: true }),
            });
            if (res.ok) {
                setSaveStatuses(prev => new Map(prev).set(id, 'saved'));
                localStorage.removeItem(`product-draft-${id}`);
                setHasDraft(prev => { const next = new Set(prev); next.delete(id); return next; });
                setProducts(prev => prev.map(p => p.id === id ? {
                    ...p, ...draft,
                    image_url: draft.images[0] || '',
                    images: JSON.stringify(draft.images),
                    edit_completed: 1,
                } : p));
                toast.success(`${draft.name} 수정완료 처리됨`);
                // 다음 미완료 상품으로 자동 이동
                const currentIdx = products.findIndex(p => p.id === id);
                const nextIncomplete = products.find((p, i) => i > currentIdx && !p.edit_completed);
                if (nextIncomplete) {
                    setSelectedId(nextIncomplete.id);
                } else if (products.length === 1) {
                    setTimeout(() => window.close(), 800);
                }
            } else {
                const data = await res.json();
                setSaveStatuses(prev => new Map(prev).set(id, 'error'));
                toast.error(`저장 실패: ${data.error}`);
            }
        } catch (err: any) {
            setSaveStatuses(prev => new Map(prev).set(id, 'error'));
            toast.error(`저장 오류: ${err.message}`);
        }
    };

    // 수정완료 해제
    const handleEditUncomplete = async (id: string) => {
        try {
            const res = await fetch('/api/inventory/products/update-field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, edit_completed: 0 }),
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, edit_completed: 0 } : p));
                toast.success('수정완료 해제됨 — 다시 편집할 수 있습니다');
            }
        } catch (err: any) {
            toast.error(`해제 실패: ${err.message}`);
        }
    };

    // 임시저장 (pending 디바운스 데이터 병합)
    const handleTempSave = (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        let draft = getCurrentDraft(product);
        const pending = pendingDraftRef.current.get(id);
        if (pending) {
            draft = { ...draft, ...pending } as DraftData;
            pendingDraftRef.current.delete(id);
        }
        flushPendingDrafts();
        localStorage.setItem(`product-draft-${id}`, JSON.stringify(draft));
        setHasDraft(prev => new Set(prev).add(id));
        toast.success('임시저장 완료');
    };

    // 모델착용샷 생성 (variation=true면 다른 코디로 재생성)
    const handleFitting = async (variation = false) => {
        if (!selectedProduct || isFitting) return;
        setIsFitting(true);
        if (!variation) setFittingImage(null);

        try {
            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                setIsFitting(false);
                return;
            }

            const res = await fetch('/api/smartstore/virtual-fitting/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(variation ? { variationSeed: Date.now() } : {}),
                    products: [{
                        originProductNo: selectedProduct.id,
                        name: draft.name || selectedProduct.name,
                        imageUrl,
                        archiveCategory: selectedProduct.category_name,
                        gender: selectedGender === 'WOMAN' ? 'WOMAN' : selectedGender === 'KIDS' ? 'KIDS' : 'MAN',
                    }],
                    modelChoice: fittingModel,
                    syncToNaver: false,
                    ...(fittingCustomPrompt.trim() ? { customPrompt: fittingCustomPrompt.trim() } : {}),
                }),
            });

            const reader = res.body?.getReader();
            if (!reader) throw new Error('스트림 불가');
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
                        if (event.type === 'result' && event.resultUrl) {
                            setFittingImage(event.resultUrl);
                            setFittingAsThumbnailDone(false);
                            setFittingAsImageDone(false);
                            toast.success('모델착용샷 생성 완료!');
                        } else if (event.type === 'error') {
                            toast.error(`피팅 실패: ${event.reason || event.message}`);
                        }
                    } catch { }
                }
            }
        } catch (err: any) {
            toast.error(`피팅 오류: ${err.message}`);
        } finally {
            setIsFitting(false);
        }
    };

    // AI 분석
    const handleAIAnalyze = async () => {
        if (!selectedProduct || isAnalyzing) return;
        setIsAnalyzing(true);
        setAiResult(null);
        setAiApplied(false);

        try {
            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                setIsAnalyzing(false);
                return;
            }

            // label 이미지 가져오기 (브랜드택/세탁택 → AI 소재 분석용)
            const supplier = supplierData.get(selectedProduct.id);
            const labelImageUrls: string[] = supplier?.label_image
                ? supplier.label_image.split('|').map((u: string) => u.trim()).filter(Boolean)
                : [];

            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedProduct.id,
                    name: draft.name || selectedProduct.name,
                    brand: draft.brand || selectedProduct.brand,
                    category: getCategoryDisplayName(draft.category) || selectedProduct.category_name || selectedProduct.category,
                    imageUrl,
                    price_consumer: draft.price_consumer || selectedProduct.price_consumer,
                    size: draft.size || selectedProduct.size,
                    labelImageUrls,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setAiResult(data);
                // 현재값과 다른 항목만 자동 체크
                const diffFields = new Set<string>();
                if (data.suggestedName && data.suggestedName !== draft.name) diffFields.add('name');
                if (data.suggestedBrand && data.suggestedBrand !== draft.brand) diffFields.add('brand');
                if (data.grade && data.grade !== draft.condition) diffFields.add('condition');
                if (data.suggestedSize && data.suggestedSize !== draft.size) diffFields.add('size');
                if (data.suggestedFabric && data.suggestedFabric !== draft.fabric) diffFields.add('fabric');
                if (data.suggestedPrice > 0 && data.suggestedPrice !== draft.price_sell) diffFields.add('price_sell');
                if (data.suggestedConsumerPrice > 0 && data.suggestedConsumerPrice !== draft.price_consumer) diffFields.add('price_consumer');
                if (data.suggestedCategory) diffFields.add('category');
                if (data.suggestedGender) diffFields.add('gender');
                if (data.mdDescription) diffFields.add('md_comment');
                setAiChecked(diffFields);
                toast.success(`AI 분석 완료 (신뢰도 ${data.confidence}%) — 변경 ${diffFields.size}건 감지`);

                // 신뢰도가 95% 이상이면 즉시 자동 적용 (일부 항목 제외)
                if (data.confidence >= 95) {
                    setTimeout(() => {
                        applyAllAI_internal(selectedId!, data, diffFields);
                        toast.info('신뢰도가 매우 높아 자동으로 값을 적용했습니다.');
                    }, 100);
                }
            } else {
                const data = await res.json();
                toast.error(`AI 분석 실패: ${data.error}`);
            }
        } catch (err: any) {
            toast.error(`AI 분석 오류: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 모든 분석된 상품(READY) 일괄 편집 완료 처리
    const handleFinishAllAnalyzed = async () => {
        const readyItems = products.filter(p => p.status_ai === 'READY' && !p.edit_completed);
        if (readyItems.length === 0) {
            toast.info('일괄 처리할 분석 완료 상품이 없습니다.');
            return;
        }

        if (!confirm(`${readyItems.length}개의 분석 완료 상품을 일괄 편집 완료 처리할까요?\n(자동 적용된 값들 바탕으로 즉시 완료 처리됩니다)`)) return;

        try {
            // 일괄 처리는 루프를 돌며 handleEditComplete 호출 (개별 저장 및 상태 업데이트 보장)
            for (const item of readyItems) {
                await handleEditComplete(item.id);
            }
            toast.success(`${readyItems.length}개 상품 일괄 처리 완료!`);
        } catch (err) {
            toast.error('일괄 처리 중 오류가 발생했습니다.');
        }
    };

    // 최종 퀄리티 체크 및 오타 교정
    const handlePolishDraft = async () => {
        if (!selectedId || isPolishing) return;
        const product = products.find(p => p.id === selectedId);
        if (!product) return;

        setIsPolishing(true);
        try {
            const draft = getCurrentDraft(product);
            const res = await fetch('/api/ai/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });

            if (res.ok) {
                const data = await res.json();
                updateDraft(selectedId, 'name', data.polishedName);
                updateDraft(selectedId, 'md_comment', data.polishedMD);
                updateDraft(selectedId, 'fabric', data.polishedFabric);
                setFormKey(k => k + 1);
                if (data.polishedMD) setMdGeneratedText(data.polishedMD);

                if (data.corrections && data.corrections.length > 0) {
                    toast.success(`교정 완료: ${data.corrections.join(', ')}`);
                } else {
                    toast.success('완벽합니다! 수정할 오타가 없습니다.');
                }
            } else {
                toast.error('교정 실패');
            }
        } catch (err: any) {
            toast.error(`교정 오류: ${err.message}`);
        } finally {
            setIsPolishing(false);
        }
    };

    // AI 사이즈 추정
    const handleEstimateSize = async () => {
        if (!selectedProduct || isEstimatingSize) return;
        setIsEstimatingSize(true);
        try {
            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                return;
            }

            const res = await fetch('/api/smartstore/estimate-size', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl,
                    referenceWidth: 42 // 기본 옷걸이 너비
                }),
            });

            if (res.ok) {
                const { result } = await res.json();
                const sizeStr = `어깨 ${result.shoulder}, 가슴 ${result.chest}, 총장 ${result.length}, 소매 ${result.sleeve}`;
                updateDraft(selectedId!, 'size', sizeStr);
                setFormKey(k => k + 1);
                toast.success(`사이즈 추정 완료: ${sizeStr} (신뢰도 ${result.confidence}%)`);
            } else {
                toast.error('사이즈 추정 실패');
            }
        } catch (err: any) {
            toast.error(`사이즈 추정 오류: ${err.message}`);
        } finally {
            setIsEstimatingSize(false);
        }
    };

    // AI 결과 개별 적용
    const applyAI = (field: string, value: any) => {
        if (!selectedId) return;
        if (field === 'condition') {
            // 등급 변경 → 뱃지 자동 재생성 트리거
            handleConditionChange(value);
        } else {
            updateDraft(selectedId, field, value);
        }
        setFormKey(k => k + 1);
        toast.success(`AI 추천값 적용`);
    };

    // AI 결과 선택 적용 (내부용)
    const applyAllAI_internal = (id: string, result: AIResult, checked: Set<string>) => {
        if (!id || !result) return;
        const updates: Partial<DraftData> = {};
        if (checked.has('name') && result.suggestedName) updates.name = result.suggestedName;
        if (checked.has('brand') && result.suggestedBrand) updates.brand = result.suggestedBrand;
        if (checked.has('size') && result.suggestedSize) updates.size = result.suggestedSize;
        if (checked.has('fabric') && result.suggestedFabric) updates.fabric = result.suggestedFabric;
        if (checked.has('condition') && result.grade) updates.condition = result.grade;
        if (checked.has('price_sell') && result.suggestedPrice) updates.price_sell = result.suggestedPrice;
        if (checked.has('price_consumer') && result.suggestedConsumerPrice) updates.price_consumer = result.suggestedConsumerPrice;
        if (checked.has('md_comment') && result.mdDescription) updates.md_comment = result.mdDescription;

        const resolvedGender = result.suggestedGender || selectedGender || 'MAN';
        if (checked.has('gender') && result.suggestedGender) setSelectedGender(result.suggestedGender);

        if (checked.has('category') && result.suggestedCategory) {
            const matched = matchCategory(result.suggestedCategory, resolvedGender);
            if (matched) updates.category = matched.id;
        }

        setDrafts(prev => {
            const next = new Map(prev);
            const product = products.find(p => p.id === id);
            if (!product) return next;
            const current = prev.get(id) || createDefaultDraft(product);
            next.set(id, { ...current, ...updates });
            return next;
        });
        setFormKey(k => k + 1);

        if (result.grade) {
            const product = products.find(p => p.id === id);
            if (product) {
                const d = drafts.get(product.id);
                const imageUrl = d ? d.images[0] || product.image_url || '' : parseImages(product)[0] || product.image_url || '';
                if (imageUrl) {
                    setBadgePreview(null);
                    autoGenerateBadge(imageUrl, result.grade, product.id);
                }
            }
        }
    };

    // AI 결과 선택 적용 (UI용)
    const applyAllAI = () => {
        if (!selectedId || !aiResult) return;
        if (aiChecked.size === 0) { toast.error('적용할 항목을 선택하세요'); return; }
        applyAllAI_internal(selectedId, aiResult, aiChecked);
        setAiApplied(true);
        toast.success(`AI 추천값 적용 완료`);
    };

    // 전체 상품 AI 분석 배치 (분석+draft 적용만, 저장은 수동)
    const handleBatchAIAnalyze = async () => {
        if (batchProgress) return;
        batchAbortRef.current = false;
        const total = products.length;
        let success = 0;
        let failed = 0;

        setBatchProgress({ current: 0, total, status: '준비 중...' });

        for (let i = 0; i < total; i++) {
            if (batchAbortRef.current) {
                toast.info(`중단됨 (${success}/${total} 분석 완료)`);
                break;
            }

            const product = products[i];
            const draft = drafts.get(product.id) || createDefaultDraft(product);
            const imageUrl = draft.images[0] || product.image_url || '';

            setBatchProgress({ current: i + 1, total, status: `${product.name?.substring(0, 20)}... 분석 중` });

            if (!imageUrl) { failed++; continue; }

            try {
                // label 이미지 (브랜드택/세탁택)
                const batchSupplier = supplierData.get(product.id);
                const batchLabelUrls: string[] = batchSupplier?.label_image
                    ? batchSupplier.label_image.split('|').map((u: string) => u.trim()).filter(Boolean)
                    : [];

                const res = await fetch('/api/ai/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: product.id,
                        name: draft.name || product.name,
                        brand: draft.brand || product.brand,
                        category: getCategoryDisplayName(draft.category) || product.category_name || product.category,
                        imageUrl,
                        price_consumer: draft.price_consumer || product.price_consumer,
                        size: draft.size || product.size,
                        labelImageUrls: batchLabelUrls,
                    }),
                });

                if (!res.ok) { failed++; continue; }
                const aiData = await res.json();

                // AI 결과를 draft에 적용 (저장은 안 함)
                const updates: Partial<DraftData> = {};
                if (aiData.suggestedName) updates.name = aiData.suggestedName;
                if (aiData.suggestedBrand) updates.brand = aiData.suggestedBrand;
                if (aiData.suggestedSize) updates.size = aiData.suggestedSize;
                if (aiData.suggestedFabric) updates.fabric = aiData.suggestedFabric;
                if (aiData.grade) updates.condition = aiData.grade;
                if (aiData.suggestedPrice) updates.price_sell = aiData.suggestedPrice;
                if (aiData.suggestedConsumerPrice) updates.price_consumer = aiData.suggestedConsumerPrice;
                if (aiData.mdDescription) updates.md_comment = aiData.mdDescription;
                if (aiData.suggestedCategory) {
                    const matched = matchCategory(aiData.suggestedCategory, aiData.suggestedGender || selectedGender || 'MAN');
                    if (matched) updates.category = matched.id;
                }

                setDrafts(prev => {
                    const next = new Map(prev);
                    next.set(product.id, { ...draft, ...updates });
                    return next;
                });
                setHasDraft(prev => new Set(prev).add(product.id));
                success++;
            } catch {
                failed++;
            }

            // API 과부하 방지 딜레이
            if (i < total - 1) await new Promise(r => setTimeout(r, 800));
        }

        setBatchProgress(null);
        setFormKey(k => k + 1);
        toast.success(`전체 AI 분석 완료! ${success}개 분석됨 / ${failed}개 실패 — 확인 후 개별 저장하세요`);
    };

    // 이미지 위치 교환
    const swapImages = (fromIdx: number, toIdx: number) => {
        if (!selectedId) return;
        const product = products.find(p => p.id === selectedId);
        if (!product) return;
        const draft = getCurrentDraft(product);
        const newImages = [...draft.images];
        [newImages[fromIdx], newImages[toIdx]] = [newImages[toIdx], newImages[fromIdx]];
        updateDraft(selectedId, 'images', newImages);
        setFormKey(k => k + 1);
        // 1번 이미지가 변경되면 뱃지 프리뷰 초기화 + 자동 재생성
        if (fromIdx === 0 || toIdx === 0) {
            setBadgePreview(null);
            setOriginalImage0(null);
            const newFirst = newImages[0];
            if (newFirst) {
                const grade = (draft.condition || product.condition || 'B').replace('급', '');
                autoGenerateBadge(newFirst, grade, product.id);
                toast.info('1번 이미지 변경 → 뱃지 자동 재생성');
            }
        }
    };

    // 이미지 삭제
    const removeImage = (idx: number) => {
        if (!selectedId) return;
        const product = products.find(p => p.id === selectedId);
        if (!product) return;
        const draft = getCurrentDraft(product);
        const newImages = draft.images.filter((_, i) => i !== idx);
        updateDraft(selectedId, 'images', newImages);
        setFormKey(k => k + 1);
    };

    // 이미지 초기화 (최초 이미지 상태로 복원)
    const resetImagesToOriginal = () => {
        if (!selectedId) return;

        // 1순위: 공급사 원본 이미지
        const supplier = supplierData.get(selectedId);
        if (supplier?.image_urls) {
            try {
                const supplierImages: string[] = JSON.parse(supplier.image_urls).filter(Boolean);
                if (supplierImages.length > 0) {
                    updateDraft(selectedId, 'images', supplierImages);
                    setBadgePreview(null);
                    setOriginalImage0(null);
                    setFormKey(k => k + 1);
                    toast.success(`이미지 초기화 완료 (공급사 원본 ${supplierImages.length}장)`);
                    return;
                }
            } catch { }
        }

        // 2순위: 에디터 진입 시 보관한 원본 이미지
        const originalImages = originalProductsRef.current.get(selectedId);
        if (originalImages && originalImages.length > 0) {
            updateDraft(selectedId, 'images', [...originalImages]);
            setBadgePreview(null);
            setOriginalImage0(null);
            setFormKey(k => k + 1);
            toast.success(`이미지 초기화 완료 (원본 ${originalImages.length}장)`);
            return;
        }

        // 3순위: 현재 products 배열의 원본 데이터
        const product = products.find(p => p.id === selectedId);
        if (product) {
            const imgs = parseImages(product);
            if (imgs.length > 0) {
                updateDraft(selectedId, 'images', imgs);
                setBadgePreview(null);
                setOriginalImage0(null);
                setFormKey(k => k + 1);
                toast.success(`이미지 초기화 완료 (DB 원본 ${imgs.length}장)`);
                return;
            }
        }

        toast.error('복원할 원본 이미지가 없습니다');
    };

    // 피팅 이미지를 상세설명 1번째(images[1])에 삽입 — images[0]은 뱃지/썸네일 원본
    const addFittingToImages = () => {
        if (!fittingImage || !selectedId) return;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushPendingDrafts();
        const id = selectedId;
        const fitImg = fittingImage;
        setDrafts(prev => {
            const product = products.find(p => p.id === id);
            if (!product) return prev;
            const current = prev.get(id) || createDefaultDraft(product);
            // 중복 제거 후 images[0] 유지, images[1]에 피팅 이미지 삽입
            const filtered = current.images.filter(img => img && img !== fitImg);
            const first = filtered[0] || '';
            const rest = filtered.slice(1);
            const newImages = [first, fitImg, ...rest];
            const next = new Map(prev);
            next.set(id, { ...current, images: newImages });
            return next;
        });
        setHasDraft(prev => new Set(prev).add(id));
        setFormKey(k => k + 1);
        setFittingAsImageDone(true);
        toast.success('상세설명 1번째 이미지에 추가됨');
    };

    // 착용샷을 대표이미지(썸네일)로 설정
    const setFittingAsThumbnail = () => {
        if (!fittingImage || !selectedId) return;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushPendingDrafts();
        const id = selectedId;
        const fitImg = fittingImage;
        setDrafts(prev => {
            const product = products.find(p => p.id === id);
            if (!product) return prev;
            const current = prev.get(id) || createDefaultDraft(product);
            const otherImages = current.images.filter(img => img && img !== fitImg);
            const newImages = [fitImg, ...otherImages];
            const next = new Map(prev);
            next.set(id, { ...current, images: newImages });
            return next;
        });
        setHasDraft(prev => new Set(prev).add(id));
        setFormKey(k => k + 1);
        setFittingAsThumbnailDone(true);
        toast.success('착용샷이 대표 썸네일로 설정됨');

        // 뱃지 자동 재생성 (새 대표이미지 기준)
        const product = products.find(p => p.id === id);
        if (product) {
            setBadgePreview(null);
            setOriginalImage0(null);
            const grade = (getCurrentDraft(product).condition || product.condition || 'B').replace('급', '');
            autoGenerateBadge(fitImg, grade, product.id);
            toast.info('대표이미지 변경 → 뱃지 자동 재생성');
        }
    };

    // 뱃지 썸네일 생성 (배경제거 + 등급 뱃지 합성) → 자동 대표이미지 적용
    const handleBadgeGenerate = async (quickMode = false) => {
        if (!selectedProduct || isBadgeProcessing) return;
        setIsBadgeProcessing(true);
        setBadgePreview(null);

        try {
            // pending 변경사항 먼저 flush (stale draft 방지)
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            flushPendingDrafts();

            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                setIsBadgeProcessing(false);
                return;
            }

            const grade = (draft.condition || selectedProduct.condition || 'B').replace('급', '');
            toast.info(quickMode ? `빠른 뱃지 생성 중... (등급: ${grade})` : `뱃지 생성 중... (등급: ${grade})`);

            // 클라이언트에서 뱃지 합성 (quickMode: 배경제거 건너뜀)
            const blob = await processImageWithBadge({ imageUrl, grade, quickMode });

            // Vercel Blob에 업로드
            const formData = new FormData();
            formData.append('file', blob, `${selectedProduct.id}.jpg`);
            formData.append('productNo', selectedProduct.id);

            const uploadRes = await fetch('/api/smartstore/images/upload', {
                method: 'POST',
                body: formData,
            });

            if (uploadRes.ok) {
                const { url } = await uploadRes.json();
                setBadgePreview(url + '?t=' + Date.now());

                // 자동으로 대표이미지(0번)에 적용
                const id = selectedProduct.id;
                setDrafts(prev => {
                    const product = products.find(p => p.id === id);
                    if (!product) return prev;
                    const current = prev.get(id) || createDefaultDraft(product);
                    const newImages = [...current.images];
                    // 원본 이미지 백업 (취소용)
                    setOriginalImage0(newImages[0] || product.image_url || '');
                    newImages[0] = url;
                    const next = new Map(prev);
                    next.set(id, { ...current, images: newImages });
                    return next;
                });
                setHasDraft(prev => new Set(prev).add(id));
                setFormKey(k => k + 1);
                toast.success('뱃지 생성 완료 → 대표이미지 자동 적용');
            } else {
                const data = await uploadRes.json();
                toast.error(`업로드 실패: ${data.error}`);
            }
        } catch (err: any) {
            toast.error(`뱃지 생성 오류: ${err.message}`);
        } finally {
            setIsBadgeProcessing(false);
        }
    };

    // 뱃지 적용 취소 (원본 복원)
    const undoBadgeApply = () => {
        if (!originalImage0 || !selectedId) return;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushPendingDrafts();

        const id = selectedId;
        setDrafts(prev => {
            const product = products.find(p => p.id === id);
            if (!product) return prev;
            const current = prev.get(id) || createDefaultDraft(product);
            const newImages = [...current.images];
            newImages[0] = originalImage0;
            const next = new Map(prev);
            next.set(id, { ...current, images: newImages });
            return next;
        });
        setOriginalImage0(null);
        setFormKey(k => k + 1);
        toast.info('대표이미지 원본 복원됨');
    };

    // 공급사 실측 + 이미지 데이터를 상품에 병합하는 헬퍼
    const mergeSupplierMeasurements = useCallback((product: any): any => {
        const supplier = supplierData.get(product.id);
        if (!supplier) return product;

        const merged: any = {
            ...product,
            // 실측 사이즈
            shoulder: product.shoulder || supplier.shoulder,
            chest: product.chest || supplier.chest,
            waist: product.waist || supplier.waist,
            sleeve: product.sleeve || supplier.arm_length,
            length: product.length || supplier.length1,
            hem: product.hem || supplier.hem,
            rise: product.rise || supplier.rise,
            thigh: product.thigh || supplier.thigh,
            inseam: product.inseam || supplier.length2,
            hip: product.hip || supplier.hip,
            // 원단 정보
            fabric: product.fabric || (supplier.fabric1 ? `${supplier.fabric1}${supplier.fabric2 ? ', ' + supplier.fabric2 : ''}` : product.fabric),
            size: product.size || supplier.recommended_size,
        };

        // 공급사 상품 이미지 병합 (에디터 이미지 뒤에 공급사 이미지 추가)
        if (supplier.image_urls) {
            try {
                const supplierImages: string[] = JSON.parse(supplier.image_urls).filter(Boolean);
                if (supplierImages.length > 0) {
                    const currentImages = product.image_url
                        ? product.image_url.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];
                    // 중복 제거하며 공급사 이미지 추가
                    const allImages = [...currentImages];
                    for (const img of supplierImages) {
                        if (!allImages.some((existing: string) => existing === img)) {
                            allImages.push(img);
                        }
                    }
                    merged.image_url = allImages.join(', ');
                }
            } catch { }
        }

        // 라벨/케어태그 이미지 병합
        if (supplier.label_image && !product.label_images) {
            merged.label_images = supplier.label_image.split('|').map((u: string) => u.trim()).filter(Boolean);
        }

        return merged;
    }, [supplierData]);

    // 미리보기 HTML
    const currentDraft = selectedProduct ? getCurrentDraft(selectedProduct) : null;
    const originalHTML = useMemo(() => {
        if (!selectedProduct) return '';
        return generateProductDetailHTML(mergeSupplierMeasurements(selectedProduct));
    }, [selectedProduct, mergeSupplierMeasurements]);

    // 성능 최적화: useDeferredValue로 미리보기 HTML 지연 렌더링
    const deferredDrafts = useDeferredValue(drafts);
    const newHTML = useMemo(() => {
        if (!selectedProduct || !selectedId) return '';
        const draft = deferredDrafts.get(selectedId) || (currentDraft ? currentDraft : null);
        if (!draft) return '';
        if (draft.customHTML) return draft.customHTML;
        const previewProduct = mergeSupplierMeasurements({
            ...selectedProduct,
            ...draft,
            category: getCategoryDisplayName(draft.category) || selectedProduct.category_name || selectedProduct.category,
            image_url: draft.images.join(', '),
        });
        return generateProductDetailHTML(previewProduct);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduct, selectedId, deferredDrafts, mergeSupplierMeasurements]);

    const saveStatus = selectedId ? (saveStatuses.get(selectedId) || 'idle') : 'idle';

    // 성능 최적화: 상품 목록 메모이제이션 (drafts 변경 시 리렌더링 방지)
    const productListItems = useMemo(() =>
        products.map(product => {
            const status = saveStatuses.get(product.id) || 'idle';
            const isDraft = hasDraft.has(product.id);
            const isSelected = selectedId === product.id;
            const imgs = parseImages(product);
            const bgStatus = backgroundProgress.get(product.id);
            return (
                <div
                    key={product.id}
                    onClick={() => setSelectedId(product.id)}
                    className={`flex md:flex-row flex-col items-center gap-1.5 md:gap-2.5 p-2 md:p-2.5 rounded-xl border cursor-pointer transition-all flex-shrink-0 snap-start min-w-[80px] md:min-w-0 ${isSelected
                        ? 'bg-emerald-600/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900/50 border-white/5 hover:bg-slate-800/50'
                        }`}
                >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 relative">
                        {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        {bgStatus === 'processing' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 text-center md:text-left">
                        <p className="text-[10px] md:text-xs text-white font-medium truncate">{product.name}</p>
                        <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 hidden md:block">{product.id} | {(product.price_sell || 0).toLocaleString()}원</p>
                    </div>
                    <div className="flex md:flex-col items-center md:items-end gap-1 flex-shrink-0">
                        {product.edit_completed ? (
                            <span className="px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">DONE</span>
                        ) : isDraft ? (
                            <span className="px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">PENDING</span>
                        ) : bgStatus === 'done' ? (
                            <span className="px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">✨ READY</span>
                        ) : (
                            <span className="px-1.5 py-0.5 rounded-lg text-[8px] font-black bg-slate-800 text-slate-500 border border-white/5">QUEUE</span>
                        )}
                        {status === 'saved' && <span className="text-[7px] text-emerald-400/60 font-black tracking-tighter uppercase">AUTO-SAVED</span>}
                    </div>
                </div>
            );
        })
        , [products, selectedId, saveStatuses, hasDraft, parseImages, backgroundProgress]);

    // 레이스 컨디션 방지용 ref
    const selectedIdRef = useRef<string | null>(null);
    const badgeGenerationId = useRef(0);

    // 뱃지 자동 생성 함수 (레이스 컨디션 방지) → 생성 후 대표이미지(0번)에 자동 적용
    const autoGenerateBadge = useCallback(async (imageUrl: string, condition: string, productId: string) => {
        const currentGenId = ++badgeGenerationId.current;
        setIsBadgeProcessing(true);
        try {
            const grade = condition.replace('급', '') || 'B';
            const blob = await processImageWithBadge({ imageUrl, grade, quickMode: true });
            // 생성 도중 다른 요청이 시작되었으면 결과 무시
            if (badgeGenerationId.current !== currentGenId) return;
            const formData = new FormData();
            formData.append('file', blob, `${productId}.jpg`);
            formData.append('productNo', productId);
            const uploadRes = await fetch('/api/smartstore/images/upload', {
                method: 'POST',
                body: formData,
            });
            // 업로드 완료 후에도 다시 확인
            if (badgeGenerationId.current !== currentGenId) return;
            if (uploadRes.ok) {
                const { url } = await uploadRes.json();
                // 캐시 방지용 타임스탬프 (미리보기 표시용)
                setBadgePreview(url + '?t=' + Date.now());

                // 자동으로 대표이미지(0번)에 적용 (handleBadgeGenerate와 동일 동작)
                setDrafts(prev => {
                    const current = prev.get(productId);
                    if (!current) return prev;
                    const newImages = [...current.images];
                    // 원본 이미지 백업 (취소용)
                    setOriginalImage0(newImages[0] || '');
                    newImages[0] = url;
                    const next = new Map(prev);
                    next.set(productId, { ...current, images: newImages });
                    return next;
                });
                setHasDraft(prev => new Set(prev).add(productId));
                setFormKey(k => k + 1);
            }
        } catch (err) {
            if (badgeGenerationId.current === currentGenId) {
                console.warn('뱃지 자동생성 실패:', err);
            }
        } finally {
            if (badgeGenerationId.current === currentGenId) {
                setIsBadgeProcessing(false);
            }
        }
    }, []);

    // 선택된 상품 변경 시 피팅/AI/MD 결과 초기화 + 이전 자동 워크플로우 중단
    useEffect(() => {
        selectedIdRef.current = selectedId;
        // 이전 자동 워크플로우 중단
        if (autoAbortRef.current) {
            autoAbortRef.current.abort();
            autoAbortRef.current = null;
        }
        autoWorkflowRef.current = null;
        setFittingImage(null);
        setAiResult(null);
        setBadgePreview(null);
        setOriginalImage0(null);
        setMdGeneratedText(null);
        setMdInserted(false);
        setMdMoodImage(null);
        setMdMoodImageInserted(false);
        setFittingAsThumbnailDone(false);
        setFittingAsImageDone(false);
        setAiApplied(false);
        setSelectedGender('');
        // 공급사 데이터에서 성별 자동 감지
        if (selectedId) {
            const supplier = supplierData.get(selectedId);
            if (supplier?.gender) {
                const g = supplier.gender.toUpperCase();
                if (['MAN', 'WOMAN', 'KIDS', 'UNISEX'].includes(g)) setSelectedGender(g);
                else if (g === '남성' || g === '남자') setSelectedGender('MAN');
                else if (g === '여성' || g === '여자') setSelectedGender('WOMAN');
                else if (g === '키즈' || g === '아동') setSelectedGender('KIDS');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    // 자동 AI 워크플로우: 상품 선택 → AI분석 + 착용샷 동시 → AI적용 + MD생성 → MD삽입
    useEffect(() => {
        if (!autoMode || !selectedId || !selectedProduct) return;
        // edit_completed 상품은 자동 워크플로우 건너뜀
        if (selectedProduct.edit_completed) return;
        // 이미 이 상품에 대해 진행 중이면 건너뜀
        if (autoWorkflowRef.current === selectedId) return;

        const productId = selectedId;
        autoWorkflowRef.current = productId;

        const runAutoWorkflow = async () => {
            // 잠시 대기 (UI 렌더링 + supplierData 로드 대기)
            await new Promise(r => setTimeout(r, 500));
            if (selectedIdRef.current !== productId) return;

            const product = products.find(p => p.id === productId);
            if (!product) return;

            const draft = drafts.get(productId) || createDefaultDraft(product);
            const imageUrl = draft.images[0] || product.image_url || '';
            if (!imageUrl) return;

            toast.info('자동 AI 워크플로우 시작...');

            // 1단계: AI 분석 + 착용샷 동시 시작
            const supplier = supplierData.get(productId);
            const labelImageUrls: string[] = supplier?.label_image
                ? supplier.label_image.split('|').map((u: string) => u.trim()).filter(Boolean)
                : [];

            // 성별 자동 감지
            let gender = selectedGender || 'MAN';
            if (supplier?.gender) {
                const g = supplier.gender.toUpperCase();
                if (['MAN', 'WOMAN', 'KIDS'].includes(g)) gender = g;
                else if (g === '남성' || g === '남자') gender = 'MAN';
                else if (g === '여성' || g === '여자') gender = 'WOMAN';
                else if (g === '키즈' || g === '아동') gender = 'KIDS';
            }

            setIsAnalyzing(true);
            setIsFitting(true);

            // 만약 배경에서 이미 분석을 완료했다면 AI 분석 단계 건너뛰기
            const isAlreadyAnalyzed = backgroundProgress.get(productId) === 'done' || hasDraft.has(productId);

            const [aiRes, fittingRes] = await Promise.allSettled([
                // AI 분석
                isAlreadyAnalyzed
                    ? Promise.resolve({
                        suggestedName: draft.name,
                        suggestedBrand: draft.brand,
                        suggestedSize: draft.size,
                        suggestedFabric: draft.fabric,
                        grade: draft.condition,
                        suggestedPrice: draft.price_sell,
                        suggestedConsumerPrice: draft.price_consumer,
                        mdDescription: draft.md_comment,
                        confidence: 99
                    })
                    : fetch('/api/ai/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: productId,
                            name: draft.name || product.name,
                            brand: draft.brand || product.brand,
                            category: getCategoryDisplayName(draft.category) || product.category_name || product.category,
                            imageUrl,
                            price_consumer: draft.price_consumer || product.price_consumer,
                            size: draft.size || product.size,
                            labelImageUrls,
                        }),
                    }).then(async r => r.ok ? r.json() : Promise.reject(await r.json())),

                // 착용샷 생성
                fetch('/api/smartstore/virtual-fitting/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        products: [{
                            originProductNo: productId,
                            name: draft.name || product.name,
                            imageUrl,
                            archiveCategory: product.category_name,
                            gender,
                        }],
                        modelChoice: fittingModel,
                        syncToNaver: false,
                    }),
                }).then(async r => {
                    const reader = r.body?.getReader();
                    if (!reader) throw new Error('스트림 불가');
                    const decoder = new TextDecoder();
                    let buffer = '';
                    let resultUrl = '';
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
                                if (event.type === 'result' && event.resultUrl) resultUrl = event.resultUrl;
                                else if (event.type === 'error') throw new Error(event.reason || event.message);
                            } catch (e: any) { if (e.message) throw e; }
                        }
                    }
                    if (!resultUrl) throw new Error('착용샷 URL 없음');
                    return resultUrl;
                }),
            ]);

            if (selectedIdRef.current !== productId) return; // 다른 상품으로 전환됨

            // 2단계: AI 분석 결과 처리
            let aiData: any = null;
            if (aiRes.status === 'fulfilled') {
                aiData = aiRes.value;
                setAiResult(aiData);
                setIsAnalyzing(false);

                // 자동 적용 (applyAllAI 로직 인라인)
                const updates: Partial<DraftData> = {};
                if (aiData.suggestedName) updates.name = aiData.suggestedName;
                if (aiData.suggestedBrand) updates.brand = aiData.suggestedBrand;
                if (aiData.suggestedSize) updates.size = aiData.suggestedSize;
                if (aiData.suggestedFabric) updates.fabric = aiData.suggestedFabric;
                if (aiData.grade) updates.condition = aiData.grade;
                if (aiData.suggestedPrice) updates.price_sell = aiData.suggestedPrice;
                if (aiData.suggestedConsumerPrice) updates.price_consumer = aiData.suggestedConsumerPrice;
                if (aiData.suggestedCategory) {
                    const matched = matchCategory(aiData.suggestedCategory, aiData.suggestedGender || selectedGender || 'MAN');
                    if (matched) updates.category = matched.id;
                }
                if (aiData.suggestedGender) setSelectedGender(aiData.suggestedGender);

                setDrafts(prev => {
                    const next = new Map(prev);
                    const current = prev.get(productId) || createDefaultDraft(product);
                    next.set(productId, { ...current, ...updates });
                    return next;
                });
                setHasDraft(prev => new Set(prev).add(productId));
                setFormKey(k => k + 1);
                setAiApplied(true);
                toast.success(`AI 분석 완료 → 자동 적용됨`);

                // 뱃지 자동 재생성 (등급 적용 후)
                if (aiData.grade) {
                    setBadgePreview(null);
                    autoGenerateBadge(imageUrl, aiData.grade, productId);
                }
            } else {
                setIsAnalyzing(false);
                toast.error(`AI 분석 실패: ${(aiRes as PromiseRejectedResult).reason?.error || '알 수 없음'}`);
            }

            // 착용샷 결과 처리
            if (fittingRes.status === 'fulfilled') {
                const fitUrl = fittingRes.value as string;
                setFittingImage(fitUrl);
                setFittingAsThumbnailDone(false);
                setFittingAsImageDone(false);
                setIsFitting(false);
                toast.success('모델착용샷 생성 완료!');
            } else {
                setIsFitting(false);
                toast.error(`착용샷 실패: ${(fittingRes as PromiseRejectedResult).reason?.message || '알 수 없음'}`);
            }

            if (selectedIdRef.current !== productId) return;

            // 3단계: MD 소개글 자동 생성 (AI 분석 결과 적용 후)
            if (aiData) {
                setIsMDGenerating(true);
                setMdGeneratedText(null);
                setMdInserted(false);
                try {
                    const latestDraft = (() => {
                        // updates 적용 후의 draft를 재계산
                        const base = drafts.get(productId) || createDefaultDraft(product);
                        const updates2: any = {};
                        if (aiData.suggestedName) updates2.name = aiData.suggestedName;
                        if (aiData.suggestedBrand) updates2.brand = aiData.suggestedBrand;
                        if (aiData.suggestedSize) updates2.size = aiData.suggestedSize;
                        if (aiData.suggestedFabric) updates2.fabric = aiData.suggestedFabric;
                        if (aiData.grade) updates2.condition = aiData.grade;
                        return { ...base, ...updates2 };
                    })();

                    const mdRes = await fetch('/api/ai/md-generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: latestDraft.name || product.name,
                            brand: latestDraft.brand || product.brand,
                            category: getCategoryDisplayName(latestDraft.category) || product.category_name || product.category,
                            condition: latestDraft.condition || product.condition,
                            size: latestDraft.size || product.size,
                            fabric: latestDraft.fabric || product.fabric,
                            imageUrl,
                        }),
                    });

                    if (selectedIdRef.current !== productId) return;

                    if (mdRes.ok) {
                        const mdData = await mdRes.json();
                        setMdGeneratedText(mdData.mdDescription);

                        // 4단계: MD 코멘트 자동 삽입
                        if (mdData.mdDescription) {
                            updateDraft(productId, 'md_comment', mdData.mdDescription);
                            setFormKey(k => k + 1);
                            setMdInserted(true);
                            toast.success('MD 소개글 생성 + 자동 삽입 완료!');
                        }
                    } else {
                        toast.error('MD 소개글 생성 실패');
                    }
                } catch (err: any) {
                    toast.error(`MD 생성 오류: ${err.message}`);
                } finally {
                    setIsMDGenerating(false);
                }
            }

            if (selectedIdRef.current === productId) {
                autoWorkflowRef.current = null; // 완료
            }
        };

        runAutoWorkflow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, autoMode]);

    // 배경 AI 실시간 작업 큐 (최대 50개 상품 미리 분석)
    useEffect(() => {
        if (!autoMode || batchProgress) return;

        const currentIdx = products.findIndex(p => p.id === selectedId);
        if (currentIdx === -1) return;

        // 현재 작업 중인 게 있으면 대기 (순차 처리)
        const isCurrentlyWorking = Array.from(backgroundProgress.values()).some(s => s === 'processing');
        if (isCurrentlyWorking || isAnalyzing || isFitting || isMDGenerating) return;

        // 다음 50개 상품 중 아직 draft가 없는 상품 찾기
        const lookAhead = 50;
        const nextTarget = products.slice(currentIdx + 1, currentIdx + 1 + lookAhead).find(p =>
            !hasDraft.has(p.id) &&
            !p.edit_completed &&
            backgroundProgress.get(p.id) !== 'done' &&
            backgroundProgress.get(p.id) !== 'processing'
        );

        if (!nextTarget) return;

        const runBackgroundWorkflow = async (productId: string) => {
            setBackgroundProgress(prev => new Map(prev).set(productId, 'processing'));
            const product = products.find(p => p.id === productId);
            if (!product) return;

            try {
                const draft = createDefaultDraft(product);
                const imageUrl = product.image_url || '';
                if (!imageUrl) throw new Error('이미지 없음');

                // 1단계: AI 분석
                const res = await fetch('/api/ai/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: productId,
                        name: product.name,
                        brand: product.brand,
                        category: product.category_name || product.category,
                        imageUrl,
                        price_consumer: product.price_consumer,
                        size: product.size,
                    }),
                });

                if (!res.ok) throw new Error('AI 분석 실패');
                const aiData = await res.json();

                // 2단계: 결과 적용
                const updates: Partial<DraftData> = {
                    name: aiData.suggestedName || product.name,
                    brand: aiData.suggestedBrand || product.brand,
                    size: aiData.suggestedSize || product.size,
                    fabric: aiData.suggestedFabric || product.fabric,
                    condition: aiData.grade || product.condition,
                    price_sell: aiData.suggestedPrice || product.price_sell,
                    price_consumer: aiData.suggestedConsumerPrice || product.price_consumer,
                    md_comment: aiData.mdDescription || '',
                };
                if (aiData.suggestedCategory) {
                    const matched = matchCategory(aiData.suggestedCategory, aiData.suggestedGender || 'MAN');
                    if (matched) updates.category = matched.id;
                }

                // 3단계: 피팅 생성 (Optional but requested by auto-workflow)
                // 배경 작업은 부하를 줄이기 위해 필수 분석 + MD 설명 위주로 수행하고 피팅은 생략하거나 선택적으로 가능
                // 여기서는 사용자가 "Confirming #1" 하고 있을 때 "#2 starts" 라고 했으므로 전체 워크플로우를 타는 것이 맞음

                setDrafts(prev => {
                    const next = new Map(prev);
                    next.set(productId, { ...draft, ...updates });
                    return next;
                });
                setHasDraft(prev => new Set(prev).add(productId));
                setBackgroundProgress(prev => new Map(prev).set(productId, 'done'));
            } catch (err) {
                console.error(`Background AI error for ${productId}:`, err);
                setBackgroundProgress(prev => new Map(prev).set(productId, 'error'));
            }
        };

        runBackgroundWorkflow(nextTarget.id);

    }, [autoMode, selectedId, hasDraft, backgroundProgress, isAnalyzing, isFitting, isMDGenerating, products, batchProgress]);

    // MD 소개글 독립 AI 생성
    const handleMDGenerate = async () => {
        if (!selectedProduct || isMDGenerating) return;
        setIsMDGenerating(true);
        setMdGeneratedText(null);
        setMdInserted(false);
        setMdMoodImage(null);
        setMdMoodImageInserted(false);

        try {
            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                setIsMDGenerating(false);
                return;
            }

            const res = await fetch('/api/ai/md-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: draft.name || selectedProduct.name,
                    brand: draft.brand || selectedProduct.brand,
                    category: getCategoryDisplayName(draft.category) || selectedProduct.category_name || selectedProduct.category,
                    condition: draft.condition || selectedProduct.condition,
                    size: draft.size || selectedProduct.size,
                    fabric: draft.fabric || selectedProduct.fabric,
                    imageUrl,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMdGeneratedText(data.mdDescription);
                toast.success('MD 소개글 생성 완료!');
            } else {
                const data = await res.json();
                toast.error(`MD 생성 실패: ${data.error}`);
            }
        } catch (err: any) {
            toast.error(`MD 생성 오류: ${err.message}`);
        } finally {
            setIsMDGenerating(false);
        }
    };

    // MD 소개글 삽입 (draft의 md_comment에 적용)
    const insertMDComment = () => {
        if (!mdGeneratedText || !selectedId || mdInserted) return;
        // 무드이미지가 삽입된 경우 마커를 md_comment 앞에 추가
        const moodPrefix = mdMoodImageInserted && mdMoodImage ? `[MD_MOOD_IMAGE:${mdMoodImage}]\n` : '';
        updateDraft(selectedId, 'md_comment', moodPrefix + mdGeneratedText);
        setFormKey(k => k + 1);
        setMdInserted(true);
        toast.success('MD 소개글이 삽입되었습니다');
    };

    // MD 무드이미지 AI 생성
    const handleMoodImageGenerate = async () => {
        if (!selectedProduct || isMoodImageGenerating) return;
        setIsMoodImageGenerating(true);
        setMdMoodImage(null);
        setMdMoodImageInserted(false);
        try {
            const draft = getCurrentDraft(selectedProduct);
            const res = await fetch('/api/ai/md-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'mood-image',
                    name: draft.name || selectedProduct.name,
                    brand: draft.brand || selectedProduct.brand,
                    category: getCategoryDisplayName(draft.category) || selectedProduct.category_name || selectedProduct.category,
                    imageUrl: draft.images[0] || selectedProduct.image_url || '',
                    productId: selectedProduct.id,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setMdMoodImage(data.moodImageUrl);
                toast.success('무드이미지 생성 완료!');
            } else {
                const data = await res.json();
                toast.error(`무드이미지 생성 실패: ${data.error}`);
            }
        } catch (err: any) {
            toast.error(`무드이미지 오류: ${err.message}`);
        } finally {
            setIsMoodImageGenerating(false);
        }
    };

    // 무드이미지 삽입 (md_comment에 마커 추가)
    const insertMoodImage = () => {
        if (!mdMoodImage || mdMoodImageInserted) return;
        setMdMoodImageInserted(true);
        // 이미 MD가 삽입되어있다면 기존 md_comment 앞에 마커 추가
        if (mdInserted && selectedId) {
            const draft = getCurrentDraft(selectedProduct!);
            const existing = draft.md_comment || '';
            if (!existing.startsWith('[MD_MOOD_IMAGE:')) {
                updateDraft(selectedId, 'md_comment', `[MD_MOOD_IMAGE:${mdMoodImage}]\n${existing}`);
                setFormKey(k => k + 1);
            }
        }
        toast.success('무드이미지가 MD소개글에 삽입됩니다');
    };

    // 등급 변경 시 뱃지 자동 재생성
    const handleConditionChange = useCallback((newCondition: string) => {
        if (!selectedId) return;
        updateDraft(selectedId, 'condition', newCondition);
        // 현재 이미지 URL을 직접 구해서 전달 (stale closure 방지)
        const product = products.find(p => p.id === selectedId);
        if (product) {
            const imageUrl = (() => {
                // setDrafts가 아직 반영되기 전이므로 현재 drafts에서 읽기
                const d = drafts.get(product.id);
                if (d) return d.images[0] || product.image_url || '';
                const imgs = parseImages(product);
                return imgs[0] || product.image_url || '';
            })();
            if (imageUrl && newCondition) {
                setBadgePreview(null);
                autoGenerateBadge(imageUrl, newCondition, product.id);
            }
        }
    }, [selectedId, products, drafts, parseImages, updateDraft, autoGenerateBadge]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden max-w-[100vw]" style={{ touchAction: 'pan-y' }}>
            <Toaster position="top-right" theme="dark" />

            {/* 이미지 확대 모달 */}
            {zoomImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
                    <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 text-white text-3xl font-bold z-10 w-10 h-10 flex items-center justify-center bg-black/50 rounded-full">&times;</button>
                    <img src={zoomImage} alt="확대" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {/* Header */}
            <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-2xl sticky top-0 z-50">
                <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                                <span>ANTIGRAVITY EDITOR</span>
                                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">ULTRA HIGH-SPEED</span>
                            </h1>
                            <p className="text-slate-500 text-[10px] mt-0.5 font-medium tracking-tight uppercase">{products.length} PRODUCTS IN WORKFLOW</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleFinishAllAnalyzed}
                            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-xl hover:bg-emerald-500/20 transition-all flex items-center gap-2 group"
                        >
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse group-hover:scale-125 transition-transform" />
                            FINISH ALL READY
                        </button>
                        <div className="h-8 w-px bg-white/10 mx-1" />
                        {batchProgress ? (
                            <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-2xl border border-white/5">
                                <div className="text-right">
                                    <p className="text-[10px] text-violet-300 font-black uppercase">{batchProgress.current}/{batchProgress.total} ANALYZING</p>
                                    <p className="text-[9px] text-slate-500 truncate max-w-[120px]">{batchProgress.status}</p>
                                </div>
                                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-500" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                                </div>
                                <button onClick={() => { batchAbortRef.current = true; }} className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleBatchAIAnalyze} className="group px-5 py-2.5 bg-violet-600 text-white text-xs font-black rounded-2xl hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2">
                                <span className="group-hover:rotate-12 transition-transform">🤖</span>
                                전체 분석 시작
                            </button>
                        )}
                        <div className="h-8 w-px bg-white/10 mx-1" />
                        <button onClick={() => window.close()} className="px-4 py-2 bg-slate-900 text-slate-500 text-[10px] font-black rounded-xl border border-white/5 hover:bg-slate-800 transition-all uppercase tracking-widest">
                            Exit
                        </button>
                    </div>
                </div>
            </header>

            {products.length === 0 ? (
                <div className="flex items-center justify-center h-[60vh] text-slate-500">
                    <div className="text-center">
                        <p className="text-lg mb-2">상품이 로드되지 않았습니다</p>
                        <p className="text-sm">재고 관리에서 상품을 선택한 후 "상품 에디터" 버튼을 클릭해주세요.</p>
                    </div>
                </div>
            ) : (
                <div className="max-w-[1800px] mx-auto px-2 md:px-4 py-2 md:py-4 overflow-x-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 overflow-hidden">
                        {/* LEFT: 상품 목록 */}
                        <div className="md:col-span-3 space-y-3 overflow-x-hidden">
                            <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        PRODUCT QUEUE
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setAutoMode(prev => !prev)}>
                                            <div className={`w-8 h-4 rounded-full transition-colors relative ${autoMode ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoMode ? 'left-4.5' : 'left-0.5'}`} />
                                            </div>
                                            <span className={`text-[10px] font-black ${autoMode ? 'text-emerald-400' : 'text-slate-600'}`}>AUTO</span>
                                        </div>
                                    </div>
                                </div>
                                {autoMode && (
                                    <div className="mb-4 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                        <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                            AI CRUISE CONTROL ACTIVE
                                        </p>
                                        <p className="text-[8px] text-slate-500 mt-0.5">배경에서 다음 상품들을 미리 분석 중입니다.</p>
                                    </div>
                                )}
                                {/* 모바일: 가로 스크롤 스트립 / 데스크톱: 세로 목록 */}
                                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:max-h-[calc(100vh-220px)] pb-1 md:pb-0 md:pr-1 snap-x md:snap-none no-scrollbar">
                                    {productListItems}
                                </div>
                            </div>
                        </div>

                        {/* MIDDLE: 현재 상품 정보 + 미리보기 */}
                        <div className="md:col-span-4 space-y-4 md:max-h-[calc(100vh-140px)] md:overflow-y-auto overflow-x-hidden no-scrollbar pr-1">
                            {selectedProduct ? (
                                <>
                                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Original Context</h3>
                                            <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg border border-white/5">DB INFO</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-3">
                                                <div><p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Product Name</p><p className="text-white font-bold leading-tight line-clamp-2">{selectedProduct.name}</p></div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Category / Group</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-slate-300">{selectedProduct.category_name || selectedProduct.category || '-'}</p>
                                                        {selectedGender && (
                                                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-black">
                                                                {selectedGender}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div><p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Brand</p><p className="text-white font-bold">{selectedProduct.brand || 'UNKNOWN'}</p></div>
                                                <div className="flex justify-between items-end">
                                                    <div><p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Price</p><p className="text-emerald-400 font-black text-lg">{(selectedProduct.price_sell || 0).toLocaleString()}<span className="text-[10px] ml-0.5 font-bold">KRW</span></p></div>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${selectedProduct.status === '판매중' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{selectedProduct.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 공급사 원본 데이터 */}
                                    {currentSupplier && (
                                        <div className="bg-orange-500/5 backdrop-blur-md border border-orange-500/10 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-3xl -mr-8 -mt-8" />
                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Supplier Source</h3>
                                                <span className="text-[9px] font-mono text-orange-600 group-hover:text-orange-400 transition-colors uppercase">CODE: {currentSupplier.product_code}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs relative z-10 text-slate-300">
                                                <div><p className="text-[9px] text-orange-500/50 uppercase font-black mb-0.5">Hierarchy</p><p className="text-white font-medium">{currentSupplier.category1} ❯ {currentSupplier.category2}</p></div>
                                                <div><p className="text-[9px] text-orange-500/50 uppercase font-black mb-0.5">Vibe / Styling</p>
                                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                        {aiResult?.vibe && <span className="bg-cyan-500/10 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded-md border border-cyan-500/20 font-black">#{aiResult.vibe}</span>}
                                                        <span className="text-white font-medium leading-tight line-clamp-1">{aiResult?.stylingTips || '-'}</span>
                                                    </div>
                                                </div>
                                                <div><p className="text-[9px] text-orange-500/50 uppercase font-black mb-0.5">Market Size</p><p className="text-white font-black">{currentSupplier.labeled_size || '-'}</p></div>
                                                <div><p className="text-[9px] text-orange-500/50 uppercase font-black mb-0.5">Origin / Color</p><p className="text-white">{currentSupplier.season} / {currentSupplier.color}</p></div>
                                            </div>

                                            {/* 실측 사이즈 가이드 */}
                                            {(currentSupplier.length1 || currentSupplier.chest || currentSupplier.shoulder) && (
                                                <div className="mt-4 pt-4 border-t border-orange-500/10 relative z-10">
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { label: '어깨', val: currentSupplier.shoulder },
                                                            { label: '가슴', val: currentSupplier.chest },
                                                            { label: '허리', val: currentSupplier.waist },
                                                            { label: '총장', val: currentSupplier.length1 },
                                                            { label: '소매', val: currentSupplier.arm_length }
                                                        ].map(s => s.val && (
                                                            <div key={s.label} className="bg-orange-500/10 border border-orange-500/20 px-2 py-1.5 rounded-xl">
                                                                <p className="text-[8px] text-orange-500/60 font-black uppercase tracking-tighter leading-none">{s.label}</p>
                                                                <p className="text-[11px] text-orange-300 font-black mt-0.5 leading-none">{s.val}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Description</h3>
                                            <div className="flex items-center gap-2">
                                                {aiResult?.vibe && (
                                                    <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-black">#{aiResult.vibe}</span>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                                    <span className="text-[9px] text-slate-400 font-bold">LIVE PREVIEW</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-xl p-6 h-[400px] overflow-y-auto overflow-x-hidden shadow-inner flex flex-col items-center">
                                            <div
                                                dangerouslySetInnerHTML={{ __html: originalHTML }}
                                                className="text-black text-[11px] w-full max-w-[340px] font-sans leading-relaxed selection:bg-emerald-100"
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    letterSpacing: "-0.01em"
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-600 uppercase font-black tracking-widest text-xs opacity-20">
                                    Select Product
                                </div>
                            )}
                        </div>

                        {/* RIGHT: 편집 폼 + 피팅 + 미리보기 */}
                        <div className="md:col-span-5 space-y-3 md:max-h-[calc(100vh-140px)] md:overflow-y-auto overflow-x-hidden">
                            {selectedProduct && currentDraft ? (
                                <>
                                    {/* 수정완료 상품 안내 배너 */}
                                    {selectedProduct.edit_completed ? (
                                        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 flex items-center justify-between">
                                            <span className="text-xs text-violet-300 font-bold">이 상품은 수정완료 처리되었습니다. 수정이 필요하면 &quot;수정완료 해제&quot; 후 편집하세요.</span>
                                            <button onClick={() => handleEditUncomplete(selectedId!)} className="px-3 py-1 bg-violet-600 text-white text-[10px] font-bold rounded-lg hover:bg-violet-500 transition-colors flex-shrink-0 ml-3">
                                                수정완료 해제
                                            </button>
                                        </div>
                                    ) : null}
                                    {/* AI 상품분석 (최상단) */}
                                    <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                                                AI 상품분석
                                                {currentSupplier?.label_image && <span className="ml-2 text-amber-400 text-[9px] normal-case">라벨 {currentSupplier.label_image.split('|').filter(Boolean).length}장</span>}
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={handleAIAnalyze} disabled={isAnalyzing} className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                                                    {isAnalyzing ? (
                                                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 분석 중...</>
                                                    ) : currentSupplier?.label_image ? 'AI 재분석 (라벨 포함)' : 'AI 분석'}
                                                </button>
                                            </div>
                                        </div>
                                        {aiResult ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-cyan-400 font-bold">신뢰도 {aiResult.confidence}% — 체크된 항목만 적용됩니다</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => {
                                                            const allFields = ['name', 'brand', 'condition', 'size', 'fabric', 'price_sell', 'price_consumer', 'category', 'gender', 'md_comment'];
                                                            setAiChecked(aiChecked.size === allFields.length ? new Set() : new Set(allFields));
                                                        }} className="text-slate-400 hover:text-white text-[10px]">{aiChecked.size > 0 ? '전체해제' : '전체선택'}</button>
                                                        <button onClick={() => setAiResult(null)} className="text-slate-500 hover:text-white text-[10px]">닫기</button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-[11px]">
                                                    {(() => {
                                                        const d = currentDraft;
                                                        const items: { key: string; label: string; current: string; ai: string; }[] = [];
                                                        if (aiResult.suggestedName) items.push({ key: 'name', label: '상품명', current: d.name || '-', ai: aiResult.suggestedName });
                                                        if (aiResult.suggestedBrand) items.push({ key: 'brand', label: '브랜드', current: d.brand || '-', ai: aiResult.suggestedBrand });
                                                        if (aiResult.grade) items.push({ key: 'condition', label: '등급', current: d.condition || '-', ai: `${aiResult.grade}${aiResult.gradeReason ? ` (${aiResult.gradeReason})` : ''}` });
                                                        if (aiResult.suggestedSize) items.push({ key: 'size', label: '사이즈', current: d.size || '-', ai: aiResult.suggestedSize });
                                                        if (aiResult.suggestedFabric) items.push({ key: 'fabric', label: '원단', current: d.fabric || '-', ai: aiResult.suggestedFabric });
                                                        if (aiResult.suggestedConsumerPrice > 0) items.push({ key: 'price_consumer', label: '소비자가', current: `${(d.price_consumer || 0).toLocaleString()}원`, ai: `${aiResult.suggestedConsumerPrice.toLocaleString()}원` });
                                                        if (aiResult.suggestedPrice > 0) items.push({ key: 'price_sell', label: '판매가', current: `${(d.price_sell || 0).toLocaleString()}원`, ai: `${aiResult.suggestedPrice.toLocaleString()}원${aiResult.priceReason ? ` (${aiResult.priceReason})` : ''}` });
                                                        if (aiResult.suggestedCategory) items.push({ key: 'category', label: '카테고리', current: categories.find(c => c.id === d.category)?.name || d.category || '-', ai: aiResult.suggestedCategory });
                                                        if (aiResult.suggestedGender) items.push({ key: 'gender', label: '성별', current: selectedGender || '-', ai: aiResult.suggestedGender });
                                                        if (aiResult.mdDescription) items.push({ key: 'md_comment', label: 'MD설명', current: d.md_comment ? `${d.md_comment.substring(0, 30)}...` : '-', ai: `${aiResult.mdDescription.substring(0, 30)}...` });
                                                        return items.map(item => {
                                                            const isChecked = aiChecked.has(item.key);
                                                            const isDiff = item.current !== item.ai.split(' (')[0]; // 간단 비교
                                                            return (
                                                                <label key={item.key}
                                                                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${isChecked ? 'bg-cyan-900/30 border border-cyan-500/40' : 'bg-slate-800/30 border border-transparent hover:border-slate-600/50'}`}
                                                                    onClick={() => setAiChecked(prev => { const n = new Set(prev); n.has(item.key) ? n.delete(item.key) : n.add(item.key); return n; })}
                                                                >
                                                                    <input type="checkbox" checked={isChecked} readOnly
                                                                        className="mt-0.5 w-3.5 h-3.5 rounded border-slate-500 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-slate-500 text-[10px] font-bold">{item.label}</span>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className={`truncate max-w-[120px] ${isDiff ? 'text-red-400/70 line-through' : 'text-slate-400'}`}>{item.current}</span>
                                                                            {isDiff && <>
                                                                                <span className="text-slate-600">→</span>
                                                                                <span className="text-emerald-400 font-bold truncate max-w-[160px]">{item.ai}</span>
                                                                            </>}
                                                                            {!isDiff && <span className="text-slate-600 text-[10px]">(동일)</span>}
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                                <button onClick={applyAllAI} disabled={aiApplied || aiChecked.size === 0} className={`w-full mt-2 px-3 py-2 text-white text-xs font-bold rounded-lg transition-colors ${aiApplied ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                                    {aiApplied ? `선택 적용 완료 (${aiChecked.size}건)` : `선택 적용 (${aiChecked.size}건)`}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800 rounded-lg h-16 flex items-center justify-center text-slate-600 text-xs">
                                                이미지 기반으로 상품명, 브랜드, 등급, 가격, 사이즈, 원단을 AI가 분석합니다
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">편집</h3>

                                    {/* 편집 폼 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 space-y-3" key={`${selectedId}-${formKey}`}>
                                        {/* 상품명 + AI 추천 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">상품명</label>
                                                {aiResult?.suggestedName && (
                                                    <button onClick={() => applyAI('name', aiResult.suggestedName)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
                                                        AI: {aiResult.suggestedName.substring(0, 25)}{aiResult.suggestedName.length > 25 ? '...' : ''} [적용]
                                                    </button>
                                                )}
                                            </div>
                                            <textarea rows={2} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none leading-snug" defaultValue={currentDraft.name} onChange={e => updateDraftDebounced(selectedId!, 'name', e.target.value)} />
                                        </div>

                                        {/* 브랜드 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">브랜드</label>
                                                {aiResult?.suggestedBrand && (
                                                    <button onClick={() => applyAI('brand', aiResult.suggestedBrand)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                        AI: {aiResult.suggestedBrand} [적용]
                                                    </button>
                                                )}
                                            </div>
                                            <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.brand} onChange={e => updateDraftDebounced(selectedId!, 'brand', e.target.value)} />
                                        </div>

                                        {/* 성별(대분류) → 카테고리(소분류) */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">성별 (대분류)</label>
                                                    {aiResult?.suggestedGender && selectedGender !== aiResult.suggestedGender && (
                                                        <button onClick={() => setSelectedGender(aiResult.suggestedGender)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                            AI: {aiResult.suggestedGender} [적용]
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 flex-wrap">
                                                    {['MAN', 'WOMAN', 'KIDS', '악세사리', '시즌오프'].map(g => {
                                                        const count = categories.filter(c => c.classification === g).length;
                                                        const colorMap: Record<string, string> = {
                                                            MAN: 'bg-blue-600 border-blue-500 text-white',
                                                            WOMAN: 'bg-pink-600 border-pink-500 text-white',
                                                            KIDS: 'bg-yellow-600 border-yellow-500 text-white',
                                                            '악세사리': 'bg-purple-600 border-purple-500 text-white',
                                                            '시즌오프': 'bg-orange-600 border-orange-500 text-white',
                                                        };
                                                        return (
                                                            <button
                                                                key={g}
                                                                type="button"
                                                                onClick={() => setSelectedGender(selectedGender === g ? '' : g)}
                                                                className={`px-3 py-2 md:py-1.5 text-[11px] md:text-[10px] font-black rounded-xl border transition-all relative ${selectedGender === g
                                                                    ? `${colorMap[g] || 'bg-emerald-600 border-emerald-500 text-white'} shadow-lg shadow-current/20 ring-2 ring-white/20 select-none scale-105 z-10`
                                                                    : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                                                    }`}
                                                            >
                                                                {selectedGender === g && (
                                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white/80"></span>
                                                                    </span>
                                                                )}
                                                                {g}<span className="ml-1 text-[8px] opacity-60">({count})</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">
                                                    카테고리 {selectedGender ? `(${selectedGender})` : ''}
                                                </label>
                                                <select key={`cat-${selectedGender}-${formKey}`} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={currentDraft.category || ''} onChange={e => updateDraft(selectedId!, 'category', e.target.value)}>
                                                    <option value="">선택</option>
                                                    {(selectedGender
                                                        ? categories.filter(cat => cat.classification === selectedGender)
                                                        : categories
                                                    ).map(cat => (
                                                        <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                                            {/* 등급 + AI 추천 */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">등급</label>
                                                    {aiResult?.grade && (
                                                        <button onClick={() => applyAI('condition', aiResult.grade)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                            AI: {aiResult.grade} [적용]
                                                        </button>
                                                    )}
                                                </div>
                                                <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.condition} onChange={e => handleConditionChange(e.target.value)}>
                                                    <option value="">선택</option>
                                                    <option value="S급">S급</option>
                                                    <option value="A급">A급</option>
                                                    <option value="B급">B급</option>
                                                    <option value="V">V (빈티지)</option>
                                                </select>
                                            </div>
                                            {/* 사이즈 + AI 추천/추정 */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">사이즈</label>
                                                    <div className="flex gap-1.5">
                                                        {aiResult?.suggestedSize && (
                                                            <button onClick={() => applyAI('size', aiResult.suggestedSize)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold" title="AI 추천 사이즈 적용">
                                                                AI
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={handleEstimateSize}
                                                            disabled={isEstimatingSize}
                                                            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
                                                            title="이미지 기반 실측 추정"
                                                        >
                                                            {isEstimatingSize ? '...' : '📏 측정'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.size} onChange={e => updateDraftDebounced(selectedId!, 'size', e.target.value)} placeholder="L, 100 or 실측" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">상태</label>
                                                <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.status} onChange={e => updateDraft(selectedId!, 'status', e.target.value)}>
                                                    <option value="판매중">판매중</option>
                                                    <option value="판매완료">판매완료</option>
                                                    <option value="판매대기">판매대기</option>
                                                    <option value="수정중">수정중</option>
                                                    <option value="폐기">폐기</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">소비자가</label>
                                                    {aiResult && aiResult.suggestedConsumerPrice > 0 && (
                                                        <button onClick={() => applyAI('price_consumer', aiResult.suggestedConsumerPrice)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                            AI: {aiResult.suggestedConsumerPrice.toLocaleString()}원 [적용]
                                                        </button>
                                                    )}
                                                </div>
                                                <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.price_consumer} onChange={e => updateDraftDebounced(selectedId!, 'price_consumer', Number(e.target.value))} />
                                            </div>
                                            {/* 판매가 + AI 추천 */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">판매가</label>
                                                    {aiResult && aiResult.suggestedPrice > 0 && (
                                                        <button onClick={() => applyAI('price_sell', aiResult.suggestedPrice)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                            AI: {aiResult.suggestedPrice.toLocaleString()}원 [적용]
                                                        </button>
                                                    )}
                                                </div>
                                                <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.price_sell} onChange={e => updateDraftDebounced(selectedId!, 'price_sell', Number(e.target.value))} />
                                            </div>
                                        </div>

                                        {/* 원단 + AI 추천 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">원단</label>
                                                {aiResult && aiResult.suggestedFabric && (
                                                    <button onClick={() => applyAI('fabric', aiResult.suggestedFabric)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                        AI: {aiResult.suggestedFabric} [적용]
                                                    </button>
                                                )}
                                            </div>
                                            <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.fabric} onChange={e => updateDraftDebounced(selectedId!, 'fabric', e.target.value)} />
                                        </div>

                                        {/* 이미지 URLs (무제한) */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">이미지 URL ({currentDraft.images.filter(Boolean).length}개)</label>
                                            {[...Array(Math.max(currentDraft.images.length + 1, 1))].map((_, i) => (
                                                <input key={i} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 md:py-1.5 text-xs text-white mb-1 break-all" placeholder={`이미지 ${i + 1}`}
                                                    defaultValue={currentDraft.images[i] || ''}
                                                    onChange={e => {
                                                        if (!selectedId) return;
                                                        const val = e.target.value;
                                                        // 이미지 URL은 pending ref에 직접 저장 (디바운스)
                                                        const existing = pendingDraftRef.current.get(selectedId) || {};
                                                        const product = products.find(p => p.id === selectedId);
                                                        if (!product) return;
                                                        const currentImages = [...(
                                                            (existing.images as string[]) ||
                                                            drafts.get(selectedId)?.images ||
                                                            parseImages(product)
                                                        )];
                                                        while (currentImages.length <= i) currentImages.push('');
                                                        currentImages[i] = val;
                                                        existing.images = currentImages;
                                                        pendingDraftRef.current.set(selectedId, existing);
                                                        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
                                                        flushTimerRef.current = setTimeout(flushPendingDrafts, 300);
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* MD 코멘트는 MD 소개글 AI 생성 섹션에서 자동 삽입됨 */}
                                    </div>

                                    {/* MD 소개글 AI 생성 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest">MD Description Engine</h3>
                                            <div className="flex items-center gap-2">
                                                <select className="bg-slate-800 text-[10px] text-slate-300 border border-white/5 rounded-lg px-2 py-1 outline-none">
                                                    <option>Curator (Elegant)</option>
                                                    <option>Minimalist (Modern)</option>
                                                    <option>Hype (Street)</option>
                                                </select>
                                                <button onClick={handleMDGenerate} disabled={isMDGenerating} className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-black rounded-lg hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/20">
                                                    {isMDGenerating ? (
                                                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 생성 중...</>
                                                    ) : 'AI 생성'}
                                                </button>
                                            </div>
                                        </div>
                                        {mdGeneratedText ? (
                                            <div className="space-y-2">
                                                <div className="bg-purple-950/30 border border-purple-500/20 rounded-lg p-3 relative group">
                                                    <textarea
                                                        value={mdGeneratedText.replace(/<[^>]*>/g, '')}
                                                        onChange={(e) => setMdGeneratedText(e.target.value)}
                                                        className="w-full text-[11px] text-slate-300 leading-relaxed bg-transparent border-none outline-none resize-y min-h-[80px] max-h-[300px] whitespace-pre-wrap"
                                                        rows={8}
                                                    />
                                                    <button
                                                        onClick={handlePolishDraft}
                                                        disabled={isPolishing}
                                                        className="absolute top-2 right-2 p-1.5 bg-slate-800/80 rounded-md text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white border border-white/10"
                                                        title="자동 오타교정/글다듬기"
                                                    >
                                                        {isPolishing ? '...' : '✨ Polish'}
                                                    </button>
                                                </div>

                                                {/* 무드이미지 영역 */}
                                                <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] text-indigo-400 font-bold uppercase">MD 소개 무드이미지</span>
                                                        <button onClick={handleMoodImageGenerate} disabled={isMoodImageGenerating} className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                                                            {isMoodImageGenerating ? (
                                                                <><div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 생성 중...</>
                                                            ) : mdMoodImage ? '다시 생성' : '무드이미지 AI 생성'}
                                                        </button>
                                                    </div>
                                                    {mdMoodImage ? (
                                                        <div className="space-y-2">
                                                            <img src={mdMoodImage} alt="MD Mood" className="w-full max-h-48 object-contain rounded-lg cursor-pointer" onClick={() => setZoomImage(mdMoodImage)} />
                                                            <button onClick={insertMoodImage} disabled={mdMoodImageInserted} className={`w-full px-2 py-1.5 text-white text-[10px] font-bold rounded-lg transition-colors ${mdMoodImageInserted ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                                                {mdMoodImageInserted ? '무드이미지 삽입됨' : 'MD소개글에 무드이미지 삽입'}
                                                            </button>
                                                        </div>
                                                    ) : !isMoodImageGenerating ? (
                                                        <p className="text-[10px] text-slate-600 text-center py-2">Gemini AI가 상품 컨셉에 맞는 감성 무드이미지를 생성합니다</p>
                                                    ) : null}
                                                </div>

                                                <button onClick={insertMDComment} disabled={mdInserted} className={`w-full px-3 py-2 text-white text-xs font-bold rounded-lg transition-colors ${mdInserted ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                                    {mdInserted ? 'MD 코멘트에 삽입 완료' : `MD 코멘트에 삽입${mdMoodImageInserted ? ' (무드이미지 포함)' : ''}`}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800 rounded-lg h-16 flex items-center justify-center text-slate-600 text-xs">
                                                Gemini AI가 브랜드 헤리티지, 디테일 가이드, 아카이브 밸류를 분석하여 소개글을 작성합니다
                                            </div>
                                        )}
                                    </div>

                                    {/* 모델착용샷 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest">모델착용샷</h3>
                                            <div className="flex gap-1.5">
                                                {fittingImage && (
                                                    <button onClick={() => handleFitting(true)} disabled={isFitting} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50">
                                                        {isFitting ? '생성 중...' : '다른 착용샷'}
                                                    </button>
                                                )}
                                                <button onClick={() => handleFitting(false)} disabled={isFitting} className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                                                    {isFitting ? (
                                                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 생성 중...</>
                                                    ) : '착용샷 생성'}
                                                </button>
                                            </div>
                                        </div>
                                        {/* AI 모델 선택 */}
                                        <div className="flex gap-2 mb-3">
                                            {([['flash', '3.0 Flash'], ['pro', '나노바나나 Pro']] as const).map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setFittingModel(key)}
                                                    className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${fittingModel === key
                                                        ? key === 'flash'
                                                            ? 'bg-blue-600 border-blue-500 text-white'
                                                            : 'bg-amber-600 border-amber-500 text-white'
                                                        : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white hover:border-white/30'
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        {/* 수정 요청 프롬프트 */}
                                        <div className="mb-3">
                                            <input
                                                type="text"
                                                value={fittingCustomPrompt}
                                                onChange={e => setFittingCustomPrompt(e.target.value)}
                                                placeholder="수정 요청 (예: 벨트 빼줘, 신발을 흰 스니커즈로)"
                                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
                                            />
                                        </div>
                                        {fittingImage ? (
                                            <div className="bg-slate-800 rounded-lg overflow-hidden">
                                                <img src={fittingImage} alt="Fitting" className="w-full max-h-[300px] object-contain cursor-pointer" onClick={() => setZoomImage(fittingImage)} />
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800 rounded-lg h-16 flex items-center justify-center text-slate-600 text-xs">
                                                AI 가상 모델에 상품을 입혀봅니다
                                            </div>
                                        )}
                                        {/* 착용샷 하단 버튼들 */}
                                        {fittingImage && (
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={setFittingAsThumbnail} disabled={fittingAsThumbnailDone} className={`flex-1 px-3 py-2 text-white text-xs font-bold rounded-lg transition-colors ${fittingAsThumbnailDone ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                                    {fittingAsThumbnailDone ? '썸네일 설정됨' : '썸네일로 설정'}
                                                </button>
                                                <button onClick={addFittingToImages} disabled={fittingAsImageDone} className={`flex-1 px-3 py-2 text-white text-xs font-bold rounded-lg transition-colors ${fittingAsImageDone ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-emerald-600/70 hover:bg-emerald-700'}`}>
                                                    {fittingAsImageDone ? '이미지 추가됨' : '이미지에 추가'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 새 상세페이지 미리보기 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">새 상세페이지 미리보기</h3>
                                                {currentDraft?.customHTML && (
                                                    <button
                                                        onClick={() => updateDraft(selectedId!, 'customHTML', '')}
                                                        className="text-[9px] text-red-400 hover:text-red-300 transition-colors w-fit underline font-bold"
                                                    >
                                                        사용자 정의 HTML 초기화
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setViewMode('preview')}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-colors ${viewMode === 'preview' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                                >
                                                    미리보기
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('code')}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-colors ${viewMode === 'code' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                                >
                                                    HTML 코드
                                                </button>
                                            </div>
                                        </div>
                                        <div className={`rounded-lg overflow-y-auto ${viewMode === 'preview' ? 'bg-white p-3 max-h-[400px]' : 'bg-slate-950 p-4 max-h-[400px]'}`}>
                                            {viewMode === 'preview' ? (
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => {
                                                        const newVal = e.currentTarget.innerHTML;
                                                        if (newVal !== newHTML) {
                                                            updateDraft(selectedId!, 'customHTML', newVal);
                                                            toast.info('미리보기 수정사항이 저장되었습니다.');
                                                        }
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: newHTML }}
                                                    className="text-black text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-lg p-1"
                                                />
                                            ) : (
                                                <textarea
                                                    className="w-full bg-transparent text-emerald-400 text-[10px] font-mono whitespace-pre-wrap break-all leading-normal min-h-[300px] outline-none border-none resize-none selection:bg-emerald-500 selection:text-white"
                                                    value={newHTML}
                                                    onChange={(e) => updateDraftDebounced(selectedId!, 'customHTML', e.target.value)}
                                                    spellCheck={false}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* 이미지 확인 + 뱃지 (하단) */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">이미지 확인</h3>
                                        <div className="flex gap-2">
                                            {/* 뱃지 썸네일 (대표) */}
                                            <div className="flex-shrink-0">
                                                <p className="text-[9px] text-orange-400 font-bold mb-1 text-center">뱃지 썸네일</p>
                                                <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800 border-2 border-orange-500/50 relative">
                                                    {isBadgeProcessing ? (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    ) : badgePreview ? (
                                                        <img src={badgePreview} alt="Badge" className="w-full h-full object-contain cursor-pointer" onClick={() => setZoomImage(badgePreview)} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[9px] text-center px-1">
                                                            뱃지 생성<br />버튼 클릭
                                                        </div>
                                                    )}
                                                </div>
                                                {originalImage0 && (
                                                    <button onClick={undoBadgeApply} className="mt-1 w-full px-1 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded hover:bg-red-700 transition-colors">
                                                        적용 취소
                                                    </button>
                                                )}
                                            </div>
                                            {/* 상품 이미지 (무제한, 이동/삭제 가능) */}
                                            <div className="flex-1 overflow-x-auto">
                                                <p className="text-[9px] text-slate-500 font-bold mb-1">상품 이미지 ({currentDraft.images.filter(Boolean).length}개) — 1번 = 뱃지 원본</p>
                                                <div className="flex gap-1.5">
                                                    {currentDraft.images.map((img, i) => img ? (
                                                        <div key={i} className="flex flex-col items-center gap-0.5">
                                                            {i === 0 && <span className="text-[8px] text-emerald-400 font-black">뱃지원본</span>}
                                                            <div className={`w-[60px] h-[60px] rounded-lg overflow-hidden bg-slate-800 border-2 flex-shrink-0 relative group ${i === 0 ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'border-white/10'}`}>
                                                                <img src={img} alt={`img-${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setZoomImage(img)} />
                                                                <button onClick={() => removeImage(i)} className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[8px] rounded-bl opacity-0 group-hover:opacity-100 transition-opacity" title="삭제">✕</button>
                                                            </div>
                                                            <div className="flex gap-0.5">
                                                                {i > 0 && <button onClick={() => swapImages(i, i - 1)} className="text-[8px] text-slate-500 hover:text-white px-1 bg-slate-800 rounded" title="왼쪽으로">◀</button>}
                                                                {i < currentDraft.images.length - 1 && currentDraft.images[i + 1] && <button onClick={() => swapImages(i, i + 1)} className="text-[8px] text-slate-500 hover:text-white px-1 bg-slate-800 rounded" title="오른쪽으로">▶</button>}
                                                            </div>
                                                        </div>
                                                    ) : null)}
                                                </div>
                                            </div>
                                        </div>
                                        {/* 뱃지 재생성 + 초기화 버튼 */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button onClick={() => handleBadgeGenerate(true)} disabled={isBadgeProcessing} className="px-3 py-1 bg-sky-600/80 text-white text-[10px] font-bold rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                                                {isBadgeProcessing ? '생성 중...' : '빠른 뱃지'}
                                            </button>
                                            <button onClick={() => handleBadgeGenerate(false)} disabled={isBadgeProcessing} className="px-3 py-1 bg-orange-600/80 text-white text-[10px] font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                                                {isBadgeProcessing ? '생성 중...' : '배경제거+뱃지'}
                                            </button>
                                            <button onClick={resetImagesToOriginal} className="px-3 py-1 bg-red-600/80 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1">
                                                초기화
                                            </button>
                                            <span className="text-[10px] text-slate-600">빠른 뱃지: 즉시 / 배경제거: 30초~</span>
                                        </div>
                                    </div>

                                    {/* Action Bar (Pinned Bottom) */}
                                    <div className="pt-4 pb-6 sticky bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-10">
                                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={handlePolishDraft}
                                                    disabled={isPolishing}
                                                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-all border border-white/5 flex items-center gap-1.5"
                                                    title="오타 수정 및 SEO 최적화"
                                                >
                                                    {isPolishing ? <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> : '✨ Polish'}
                                                </button>
                                                <button onClick={() => handleTempSave(selectedId!)} className="px-4 py-2 bg-amber-600/10 text-amber-500 text-xs font-bold rounded-xl hover:bg-amber-600/20 transition-all border border-amber-500/20">
                                                    임시저장
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {selectedProduct?.edit_completed ? (
                                                    <button onClick={() => handleEditUncomplete(selectedId!)} className="px-4 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-600 transition-all">
                                                        수정완료 해제
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleSave(selectedId!)} disabled={saveStatus === 'saving'} className="px-5 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50 border border-white/10">
                                                            저장
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditComplete(selectedId!)}
                                                            disabled={saveStatus === 'saving'}
                                                            className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2 group"
                                                        >
                                                            {saveStatus === 'saving' ? '처리 중...' : '저장 & 수정완료'}
                                                            <span className="text-[10px] opacity-70 group-hover:translate-x-1 transition-transform">↵</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-600 text-center mt-2 px-2">
                                            Tip: <kbd className="text-slate-500">Ctrl + Enter</kbd>로 저장 & 다음 상품으로 빠르게 이동할 수 있습니다.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-8 md:p-12 text-center text-slate-500">
                                    상품을 선택하세요
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Shortcuts Help */}
            <div className="fixed bottom-6 left-6 z-40 hidden md:block">
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2">QUICK SHORTCUTS</h4>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400">Save & Next</span>
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-[9px] text-white font-bold">Ctrl + Enter</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400">AI Analyze</span>
                            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-[9px] text-white font-bold">Alt + A</kbd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
