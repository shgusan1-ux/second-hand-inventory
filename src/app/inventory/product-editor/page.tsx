'use client';

import { useEffect, useState, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import { toast, Toaster } from 'sonner';
import { generateProductDetailHTML } from '@/lib/product-detail-generator';
import { processImageWithBadge } from '@/lib/image-processor';

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
}

interface CategoryItem {
    id: string;
    name: string;
    sort_order: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AIResult {
    suggestedName: string;
    suggestedBrand: string;
    suggestedSize: string;
    suggestedFabric: string;
    grade: string;
    gradeReason: string;
    suggestedPrice: number;
    priceReason: string;
    mdDescription: string;
    confidence: number;
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
    const [formKey, setFormKey] = useState(0);
    const [isBadgeProcessing, setIsBadgeProcessing] = useState(false);
    const [badgePreview, setBadgePreview] = useState<string | null>(null);
    const [isMDGenerating, setIsMDGenerating] = useState(false);
    const [mdGeneratedText, setMdGeneratedText] = useState<string | null>(null);
    const [supplierData, setSupplierData] = useState<Map<string, any>>(new Map());
    const [isSupplierLoading, setIsSupplierLoading] = useState(false);

    // cleanup: 디바운스 타이머 해제
    useEffect(() => {
        return () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); };
    }, []);

    // 상품 + 카테고리 로드
    useEffect(() => {
        const data = sessionStorage.getItem('product-editor-data');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                setProducts(parsed);
                if (parsed.length > 0) setSelectedId(parsed[0].id);
            } catch { }
            sessionStorage.removeItem('product-editor-data');
        }
        // 카테고리 (inventory-table에서 전달)
        const catData = sessionStorage.getItem('product-editor-categories');
        if (catData) {
            try { setCategories(JSON.parse(catData)); } catch { }
            sessionStorage.removeItem('product-editor-categories');
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
        if (!brand && !name) return;
        setIsSupplierLoading(true);
        const params = new URLSearchParams();
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
            .catch(() => {})
            .finally(() => setIsSupplierLoading(false));
    }, [selectedProduct, supplierData]);

    // 현재 상품의 공급사 데이터
    const currentSupplier = selectedId ? supplierData.get(selectedId) : null;

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

    // 모델착용샷 생성
    const handleFitting = async () => {
        if (!selectedProduct || isFitting) return;
        setIsFitting(true);
        setFittingImage(null);

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
                    products: [{
                        originProductNo: selectedProduct.id,
                        name: draft.name || selectedProduct.name,
                        imageUrl,
                        archiveCategory: selectedProduct.category_name,
                    }],
                    modelChoice: 'flash',
                    syncToNaver: false,
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

        try {
            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                setIsAnalyzing(false);
                return;
            }

            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedProduct.id,
                    name: draft.name || selectedProduct.name,
                    brand: draft.brand || selectedProduct.brand,
                    category: draft.category || selectedProduct.category_name || selectedProduct.category,
                    imageUrl,
                    price_consumer: draft.price_consumer || selectedProduct.price_consumer,
                    size: draft.size || selectedProduct.size,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setAiResult(data);
                toast.success(`AI 분석 완료 (신뢰도 ${data.confidence}%)`);
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

    // AI 결과 전체 적용
    const applyAllAI = () => {
        if (!selectedId || !aiResult) return;
        const updates: Partial<DraftData> = {};
        if (aiResult.suggestedName) updates.name = aiResult.suggestedName;
        if (aiResult.suggestedBrand) updates.brand = aiResult.suggestedBrand;
        if (aiResult.suggestedSize) updates.size = aiResult.suggestedSize;
        if (aiResult.suggestedFabric) updates.fabric = aiResult.suggestedFabric;
        if (aiResult.grade) updates.condition = aiResult.grade;
        if (aiResult.suggestedPrice) updates.price_sell = aiResult.suggestedPrice;
        if (aiResult.mdDescription) updates.md_comment = aiResult.mdDescription;

        setDrafts(prev => {
            const next = new Map(prev);
            const product = products.find(p => p.id === selectedId);
            if (!product) return next;
            // prev에서 직접 읽어 stale closure 방지
            const current = prev.get(selectedId) || {
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
            };
            next.set(selectedId, { ...current, ...updates });
            return next;
        });
        setFormKey(k => k + 1);

        // 등급이 변경되었으면 뱃지 자동 재생성
        if (aiResult.grade) {
            const product = products.find(p => p.id === selectedId);
            if (product) {
                const d = drafts.get(product.id);
                const imageUrl = d ? d.images[0] || product.image_url || '' : parseImages(product)[0] || product.image_url || '';
                if (imageUrl) {
                    setBadgePreview(null);
                    autoGenerateBadge(imageUrl, aiResult.grade, product.id);
                }
            }
        }
        toast.success('AI 추천값 전체 적용 완료');
    };

    // 피팅 이미지를 상품 이미지 1번(상세 첫번째)에 추가
    const addFittingToImages = () => {
        if (!fittingImage || !selectedId) return;
        const product = products.find(p => p.id === selectedId);
        if (!product) return;
        const draft = getCurrentDraft(product);
        // 기존 이미지 앞에 삽입, 최대 5개 유지
        const newImages = [fittingImage, ...draft.images.filter(img => img && img !== fittingImage)].slice(0, 5);
        updateDraft(selectedId, 'images', newImages);
        setFormKey(k => k + 1);
        toast.success('상세 이미지 1번에 추가됨');
    };

    // 뱃지 썸네일 생성 (배경제거 + 등급 뱃지 합성)
    const handleBadgeGenerate = async () => {
        if (!selectedProduct || isBadgeProcessing) return;
        setIsBadgeProcessing(true);
        setBadgePreview(null);

        try {
            const draft = getCurrentDraft(selectedProduct);
            const imageUrl = draft.images[0] || selectedProduct.image_url || '';
            if (!imageUrl) {
                toast.error('상품 이미지가 없습니다.');
                setIsBadgeProcessing(false);
                return;
            }

            const grade = (draft.condition || selectedProduct.condition || 'B').replace('급', '');
            toast.info(`뱃지 생성 중... (등급: ${grade})`);

            // 클라이언트에서 배경제거 + 뱃지 합성
            const blob = await processImageWithBadge({ imageUrl, grade });

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
                setBadgePreview(url);
                toast.success('뱃지 썸네일 생성 완료!');
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

    // 뱃지 이미지를 대표이미지(0번)에 적용
    const applyBadgeToImages = () => {
        if (!badgePreview || !selectedId) return;
        const product = products.find(p => p.id === selectedId);
        if (!product) return;
        const draft = getCurrentDraft(product);
        const newImages = [...draft.images];
        newImages[0] = badgePreview;
        updateDraft(selectedId, 'images', newImages);
        setFormKey(k => k + 1);
        toast.success('대표이미지에 뱃지 적용됨');
    };

    // 미리보기 HTML
    const currentDraft = selectedProduct ? getCurrentDraft(selectedProduct) : null;
    const originalHTML = useMemo(() => {
        if (!selectedProduct) return '';
        return generateProductDetailHTML(selectedProduct);
    }, [selectedProduct]);

    // 성능 최적화: useDeferredValue로 미리보기 HTML 지연 렌더링
    const deferredDrafts = useDeferredValue(drafts);
    const newHTML = useMemo(() => {
        if (!selectedProduct || !selectedId) return '';
        const draft = deferredDrafts.get(selectedId) || (currentDraft ? currentDraft : null);
        if (!draft) return '';
        const previewProduct = {
            ...selectedProduct,
            ...draft,
            image_url: draft.images.join(', '),
        };
        return generateProductDetailHTML(previewProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProduct, selectedId, deferredDrafts]);

    const saveStatus = selectedId ? (saveStatuses.get(selectedId) || 'idle') : 'idle';

    // 성능 최적화: 상품 목록 메모이제이션 (drafts 변경 시 리렌더링 방지)
    const productListItems = useMemo(() =>
        products.map(product => {
            const status = saveStatuses.get(product.id) || 'idle';
            const isDraft = hasDraft.has(product.id);
            const isSelected = selectedId === product.id;
            const imgs = parseImages(product);
            return (
                <div
                    key={product.id}
                    onClick={() => setSelectedId(product.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? 'bg-emerald-600/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900/50 border-white/5 hover:bg-slate-800/50'
                    }`}
                >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                        {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{product.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{product.id} | {(product.price_sell || 0).toLocaleString()}원</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {status === 'saved' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">저장됨</span>}
                        {status === 'saving' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">저장중</span>}
                        {status === 'error' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">오류</span>}
                        {isDraft && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">임시</span>}
                    </div>
                </div>
            );
        })
    , [products, selectedId, saveStatuses, hasDraft, parseImages]);

    // 레이스 컨디션 방지용 ref
    const selectedIdRef = useRef<string | null>(null);
    const badgeGenerationId = useRef(0);

    // 뱃지 자동 생성 함수 (레이스 컨디션 방지)
    const autoGenerateBadge = useCallback(async (imageUrl: string, condition: string, productId: string) => {
        const currentGenId = ++badgeGenerationId.current;
        setIsBadgeProcessing(true);
        try {
            const grade = condition.replace('급', '') || 'B';
            const blob = await processImageWithBadge({ imageUrl, grade });
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
                setBadgePreview(url);
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

    // 선택된 상품 변경 시 피팅/AI/MD 결과 초기화 (뱃지는 수동 생성)
    useEffect(() => {
        selectedIdRef.current = selectedId;
        setFittingImage(null);
        setAiResult(null);
        setBadgePreview(null);
        setMdGeneratedText(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    // MD 소개글 독립 AI 생성
    const handleMDGenerate = async () => {
        if (!selectedProduct || isMDGenerating) return;
        setIsMDGenerating(true);
        setMdGeneratedText(null);

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
                    category: draft.category || selectedProduct.category_name || selectedProduct.category,
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
        if (!mdGeneratedText || !selectedId) return;
        updateDraft(selectedId, 'md_comment', mdGeneratedText);
        setFormKey(k => k + 1);
        toast.success('MD 소개글이 삽입되었습니다');
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
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            <Toaster position="top-right" theme="dark" />

            {/* Header */}
            <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-white flex items-center gap-3">
                            <span className="bg-emerald-600 px-3 py-1 rounded-lg text-sm">EDITOR</span>
                            상품 에디터
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">{products.length}개 상품 로드됨</p>
                    </div>
                    <button onClick={() => window.close()} className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-700 border border-white/10">
                        닫기
                    </button>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="flex items-center justify-center h-[60vh] text-slate-500">
                    <div className="text-center">
                        <p className="text-lg mb-2">상품이 로드되지 않았습니다</p>
                        <p className="text-sm">재고 관리에서 상품을 선택한 후 "상품 에디터" 버튼을 클릭해주세요.</p>
                    </div>
                </div>
            ) : (
                <div className="max-w-[1800px] mx-auto px-4 py-4">
                    <div className="grid grid-cols-12 gap-4">
                        {/* LEFT: 상품 목록 */}
                        <div className="col-span-3 space-y-2">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                                상품 목록 ({products.length})
                            </h2>
                            <div className="space-y-1.5 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
                                {productListItems}
                            </div>
                        </div>

                        {/* MIDDLE: 현재 상품 정보 + 미리보기 */}
                        <div className="col-span-4 space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto">
                            {selectedProduct ? (
                                <>
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">현재 정보</h3>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between"><span className="text-slate-500">상품명</span><span className="text-white font-medium truncate ml-2">{selectedProduct.name}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">브랜드</span><span className="text-white">{selectedProduct.brand || '-'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">카테고리</span><span className="text-white">{selectedProduct.category_name || selectedProduct.category || '-'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">등급</span><span className="text-white">{selectedProduct.condition || '-'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">판매가</span><span className="text-emerald-400 font-bold">{(selectedProduct.price_sell || 0).toLocaleString()}원</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">상태</span><span className="text-white">{selectedProduct.status}</span></div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">현재 상세페이지</h3>
                                        <div className="bg-white rounded-lg p-3 max-h-[400px] overflow-y-auto">
                                            <div dangerouslySetInnerHTML={{ __html: originalHTML }} className="text-black text-xs" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center text-slate-500">
                                    좌측에서 상품을 선택하세요
                                </div>
                            )}
                        </div>

                        {/* RIGHT: 편집 폼 + 피팅 + 미리보기 */}
                        <div className="col-span-5 space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto">
                            {selectedProduct && currentDraft ? (
                                <>
                                    {/* 썸네일 이미지 확인 */}
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
                                                        <img src={badgePreview} alt="Badge" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[9px] text-center px-1">
                                                            뱃지 생성<br/>버튼 클릭
                                                        </div>
                                                    )}
                                                </div>
                                                {badgePreview && (
                                                    <button onClick={applyBadgeToImages} className="mt-1 w-full px-1 py-0.5 bg-orange-600 text-white text-[9px] font-bold rounded hover:bg-orange-700 transition-colors">
                                                        대표 적용
                                                    </button>
                                                )}
                                            </div>
                                            {/* 상품 이미지 1~5 */}
                                            <div className="flex-1">
                                                <p className="text-[9px] text-slate-500 font-bold mb-1">상품 이미지 (1~5)</p>
                                                <div className="flex gap-1.5">
                                                    {[0, 1, 2, 3, 4].map(i => (
                                                        <div key={i} className={`w-[60px] h-[60px] rounded-lg overflow-hidden bg-slate-800 border flex-shrink-0 ${i === 0 ? 'border-emerald-500/50' : 'border-white/10'}`}>
                                                            {currentDraft.images[i] ? (
                                                                <img src={currentDraft.images[i]} alt={`img-${i+1}`} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-700 text-[10px]">{i + 1}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* 뱃지 재생성 버튼 */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button onClick={handleBadgeGenerate} disabled={isBadgeProcessing} className="px-3 py-1 bg-orange-600/80 text-white text-[10px] font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                                                {isBadgeProcessing ? '생성 중...' : '뱃지 재생성'}
                                            </button>
                                            <span className="text-[10px] text-slate-600">등급/이미지 설정 후 클릭하세요</span>
                                        </div>
                                    </div>

                                    {/* 저장 버튼 */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">편집</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleTempSave(selectedId!)} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                                                임시저장
                                            </button>
                                            <button onClick={() => handleSave(selectedId!)} disabled={saveStatus === 'saving'} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                                {saveStatus === 'saving' ? '저장 중...' : '저장'}
                                            </button>
                                        </div>
                                    </div>

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
                                            <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.name} onChange={e => updateDraftDebounced(selectedId!, 'name', e.target.value)} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* 브랜드 + AI 추천 */}
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
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">카테고리</label>
                                                <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.category} onChange={e => updateDraft(selectedId!, 'category', e.target.value)}>
                                                    <option value="">선택</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.name}>{cat.name} ({cat.sort_order})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
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
                                            {/* 사이즈 + AI 추천 */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">사이즈</label>
                                                    {aiResult?.suggestedSize && (
                                                        <button onClick={() => applyAI('size', aiResult.suggestedSize)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                            AI: {aiResult.suggestedSize} [적용]
                                                        </button>
                                                    )}
                                                </div>
                                                <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.size} onChange={e => updateDraftDebounced(selectedId!, 'size', e.target.value)} />
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

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">소비자가</label>
                                                <input type="number" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.price_consumer} onChange={e => updateDraftDebounced(selectedId!, 'price_consumer', Number(e.target.value))} />
                                            </div>
                                            {/* 판매가 + AI 추천 */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-slate-500 uppercase font-bold">판매가</label>
                                                    {aiResult?.suggestedPrice && (
                                                        <button onClick={() => applyAI('price_sell', aiResult.suggestedPrice)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                            AI: {aiResult.suggestedPrice.toLocaleString()}원 [적용]
                                                        </button>
                                                    )}
                                                </div>
                                                <input type="number" className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.price_sell} onChange={e => updateDraftDebounced(selectedId!, 'price_sell', Number(e.target.value))} />
                                            </div>
                                        </div>

                                        {/* 원단 + AI 추천 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold">원단</label>
                                                {aiResult?.suggestedFabric && (
                                                    <button onClick={() => applyAI('fabric', aiResult.suggestedFabric)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">
                                                        AI: {aiResult.suggestedFabric} [적용]
                                                    </button>
                                                )}
                                            </div>
                                            <input className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" defaultValue={currentDraft.fabric} onChange={e => updateDraftDebounced(selectedId!, 'fabric', e.target.value)} />
                                        </div>

                                        {/* 이미지 URLs */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">이미지 URL (최대 5개)</label>
                                            {[0, 1, 2, 3, 4].map(i => (
                                                <input key={i} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white mb-1" placeholder={`이미지 ${i + 1}`}
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

                                        {/* MD 코멘트 */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold">MD 코멘트</label>
                                            <textarea className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[80px]" defaultValue={currentDraft.md_comment} onChange={e => updateDraftDebounced(selectedId!, 'md_comment', e.target.value)} placeholder="아래 'MD 소개글 AI 생성' 섹션에서 자동 생성 후 삽입할 수 있습니다." />
                                        </div>
                                    </div>

                                    {/* AI 상품분석 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AI 상품분석</h3>
                                            <div className="flex gap-2">
                                                {aiResult && (
                                                    <button onClick={applyAllAI} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors">
                                                        전체 적용
                                                    </button>
                                                )}
                                                <button onClick={handleAIAnalyze} disabled={isAnalyzing} className="px-3 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1.5">
                                                    {isAnalyzing ? (
                                                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 분석 중...</>
                                                    ) : 'AI 분석 실행'}
                                                </button>
                                            </div>
                                        </div>
                                        {aiResult ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-cyan-400 font-bold">신뢰도 {aiResult.confidence}%</span>
                                                    <button onClick={() => setAiResult(null)} className="text-slate-500 hover:text-white text-[10px]">닫기</button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    {aiResult.suggestedName && (
                                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                                            <span className="text-slate-500">상품명</span>
                                                            <p className="text-white truncate">{aiResult.suggestedName}</p>
                                                            <button onClick={() => applyAI('name', aiResult.suggestedName)} className="text-cyan-400 text-[10px] font-bold mt-1 hover:text-cyan-300">[적용]</button>
                                                        </div>
                                                    )}
                                                    {aiResult.suggestedBrand && (
                                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                                            <span className="text-slate-500">브랜드</span>
                                                            <p className="text-white">{aiResult.suggestedBrand}</p>
                                                            <button onClick={() => applyAI('brand', aiResult.suggestedBrand)} className="text-cyan-400 text-[10px] font-bold mt-1 hover:text-cyan-300">[적용]</button>
                                                        </div>
                                                    )}
                                                    {aiResult.grade && (
                                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                                            <span className="text-slate-500">등급</span>
                                                            <p className="text-white">{aiResult.grade}</p>
                                                            {aiResult.gradeReason && <p className="text-slate-500 text-[10px]">{aiResult.gradeReason}</p>}
                                                            <button onClick={() => applyAI('condition', aiResult.grade)} className="text-cyan-400 text-[10px] font-bold mt-1 hover:text-cyan-300">[적용]</button>
                                                        </div>
                                                    )}
                                                    {aiResult.suggestedPrice > 0 && (
                                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                                            <span className="text-slate-500">추천가</span>
                                                            <p className="text-white">{aiResult.suggestedPrice.toLocaleString()}원</p>
                                                            {aiResult.priceReason && <p className="text-slate-500 text-[10px] truncate">{aiResult.priceReason}</p>}
                                                            <button onClick={() => applyAI('price_sell', aiResult.suggestedPrice)} className="text-cyan-400 text-[10px] font-bold mt-1 hover:text-cyan-300">[적용]</button>
                                                        </div>
                                                    )}
                                                    {aiResult.suggestedSize && (
                                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                                            <span className="text-slate-500">사이즈</span>
                                                            <p className="text-white">{aiResult.suggestedSize}</p>
                                                            <button onClick={() => applyAI('size', aiResult.suggestedSize)} className="text-cyan-400 text-[10px] font-bold mt-1 hover:text-cyan-300">[적용]</button>
                                                        </div>
                                                    )}
                                                    {aiResult.suggestedFabric && (
                                                        <div className="bg-slate-800/50 rounded-lg p-2">
                                                            <span className="text-slate-500">원단</span>
                                                            <p className="text-white">{aiResult.suggestedFabric}</p>
                                                            <button onClick={() => applyAI('fabric', aiResult.suggestedFabric)} className="text-cyan-400 text-[10px] font-bold mt-1 hover:text-cyan-300">[적용]</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800 rounded-lg h-16 flex items-center justify-center text-slate-600 text-xs">
                                                이미지 기반으로 상품명, 브랜드, 등급, 가격, 사이즈, 원단을 AI가 분석합니다
                                            </div>
                                        )}
                                    </div>

                                    {/* MD 소개글 AI 생성 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">MD 소개글 AI 생성</h3>
                                            <div className="flex gap-2">
                                                {mdGeneratedText && (
                                                    <button onClick={insertMDComment} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                                        MD 코멘트에 삽입
                                                    </button>
                                                )}
                                                <button onClick={handleMDGenerate} disabled={isMDGenerating} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
                                                    {isMDGenerating ? (
                                                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 생성 중...</>
                                                    ) : 'MD 소개글 생성'}
                                                </button>
                                            </div>
                                        </div>
                                        {mdGeneratedText ? (
                                            <div className="bg-purple-950/30 border border-purple-500/20 rounded-lg p-3">
                                                <p className="text-[11px] text-slate-300 leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap">{mdGeneratedText.replace(/<[^>]*>/g, '')}</p>
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
                                            <div className="flex gap-2">
                                                {fittingImage && (
                                                    <button onClick={addFittingToImages} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                                                        이미지에 추가
                                                    </button>
                                                )}
                                                <button onClick={handleFitting} disabled={isFitting} className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                                                    {isFitting ? (
                                                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 생성 중...</>
                                                    ) : '착용샷 생성'}
                                                </button>
                                            </div>
                                        </div>
                                        {fittingImage ? (
                                            <div className="bg-slate-800 rounded-lg overflow-hidden">
                                                <img src={fittingImage} alt="Fitting" className="w-full max-h-[300px] object-contain" />
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800 rounded-lg h-16 flex items-center justify-center text-slate-600 text-xs">
                                                AI 가상 모델에 상품을 입혀봅니다
                                            </div>
                                        )}
                                    </div>

                                    {/* 새 상세페이지 미리보기 */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">새 상세페이지 미리보기</h3>
                                        <div className="bg-white rounded-lg p-3 max-h-[400px] overflow-y-auto">
                                            <div dangerouslySetInnerHTML={{ __html: newHTML }} className="text-black text-xs" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center text-slate-500">
                                    좌측에서 상품을 선택하세요
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
