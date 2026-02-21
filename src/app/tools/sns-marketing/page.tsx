'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import {
    Search, Megaphone, ImageIcon, Type, Hash, Download, Copy, Check,
    Loader2, Instagram, Facebook, X, Plus, Trash2, ChevronDown, ChevronUp,
    Sparkles, LayoutTemplate, FileText, ExternalLink, Send, Wifi, WifiOff,
    AlertTriangle,
} from 'lucide-react';

// ─── 타입 ───────────────────────────────────────────

type SNSPlatform = 'instagram-feed' | 'instagram-story' | 'facebook' | 'naver-blog' | 'daangn' | 'bungae' | 'kakao';
type ContentType = 'editorial-image' | 'template-card' | 'caption' | 'blog-html';
type ContentCategory = 'brand-story' | 'behind-scenes' | 'product-feature';
type MainTab = 'brand' | 'product';

const CONTENT_CATEGORIES: Record<ContentCategory, { nameKr: string; desc: string; icon: string }> = {
    'brand-story':     { nameKr: '브랜드 스토리',   icon: '📖', desc: '빈티지 트렌드, 브랜드 히스토리, 스타일링 팁' },
    'behind-scenes':   { nameKr: '비하인드 스토리', icon: '🎬', desc: '작업일지, 입고 뒷이야기, 셀러의 일상' },
    'product-feature': { nameKr: '상품 소개',       icon: '🏷️', desc: '개별 상품 소개, 신상 입고, 가격/등급 정보' },
};

interface PlatformInfo {
    nameKr: string;
    icon: string;
    hasImage: boolean;
    hasCaption: boolean;
    hasBlog: boolean;
}

const PLATFORMS: Record<SNSPlatform, PlatformInfo> = {
    'instagram-feed':  { nameKr: '인스타 피드',   icon: '📸', hasImage: true,  hasCaption: true,  hasBlog: false },
    'instagram-story': { nameKr: '인스타 스토리', icon: '📱', hasImage: true,  hasCaption: true,  hasBlog: false },
    'facebook':        { nameKr: '페이스북',     icon: '👤', hasImage: true,  hasCaption: true,  hasBlog: false },
    'naver-blog':      { nameKr: '네이버 블로그', icon: '📝', hasImage: false, hasCaption: true,  hasBlog: true },
    'daangn':          { nameKr: '당근마켓',     icon: '🥕', hasImage: false, hasCaption: true,  hasBlog: false },
    'bungae':          { nameKr: '번개장터',     icon: '⚡', hasImage: false, hasCaption: true,  hasBlog: false },
    'kakao':           { nameKr: '카카오톡',     icon: '💬', hasImage: true,  hasCaption: true,  hasBlog: false },
};

interface ProductData {
    id: string;
    name: string;
    brand: string;
    category: string;
    category_name?: string;
    price_sell: number;
    price_consumer: number;
    condition: string;
    image_url: string;
    size?: string;
    fabric?: string;
    md_comment?: string;
}

interface PlatformResult {
    editorialImageUrl?: string;
    templateImageUrl?: string;
    caption?: string;
    hashtags?: string[];
    title?: string;
    htmlContent?: string;
}

interface MetaStatus {
    connected: boolean;
    tokenValid: boolean;
    currentPageName?: string;
    igUsername?: string;
    missingScopes?: string[];
    error?: string;
}

// Meta API 자동 게시 가능 플랫폼
const META_PLATFORMS: SNSPlatform[] = ['facebook', 'instagram-feed', 'instagram-story'];

// ─── 메인 페이지 ────────────────────────────────────

export default function SNSMarketingPage() {
    // 메인 탭
    const [mainTab, setMainTab] = useState<MainTab>('brand');

    // 브랜드 콘텐츠
    const [brandCategory, setBrandCategory] = useState<ContentCategory>('brand-story');
    const [brandTopic, setBrandTopic] = useState('');
    const [brandResults, setBrandResults] = useState<Record<SNSPlatform, PlatformResult>>({} as any);

    // 검색
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ProductData[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 선택된 상품
    const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
    const [batchProducts, setBatchProducts] = useState<ProductData[]>([]);
    const [mode, setMode] = useState<'single' | 'batch'>('single');

    // 플랫폼 & 콘텐츠 선택
    const [selectedPlatforms, setSelectedPlatforms] = useState<SNSPlatform[]>(['instagram-feed']);
    const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(['template-card', 'caption']);

    // 생성 상태
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

    // 결과
    const [results, setResults] = useState<Record<SNSPlatform, PlatformResult>>({} as any);
    const [activePlatformTab, setActivePlatformTab] = useState<SNSPlatform>('instagram-feed');

    // 복사 상태
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Meta API 연결 상태
    const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
    const [isPublishing, setIsPublishing] = useState<string | null>(null); // 게시 중인 플랫폼

    useEffect(() => {
        fetch('/api/sns/meta')
            .then(res => res.json())
            .then(data => setMetaStatus(data))
            .catch(() => setMetaStatus({ connected: false, tokenValid: false }));
    }, []);

    // ─── Meta 게시 ────────────────────────────────────

    const handlePublish = async (platform: SNSPlatform, message: string, imageUrl?: string) => {
        if (!metaStatus?.connected || !metaStatus?.tokenValid) {
            toast.error('Meta API가 연결되지 않았습니다');
            return;
        }

        setIsPublishing(platform);
        try {
            const res = await fetch('/api/sns/meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, message, imageUrl }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(`${PLATFORMS[platform].nameKr}에 게시 완료!`);
                if (data.postUrl) {
                    window.open(data.postUrl, '_blank');
                }
            } else {
                toast.error(`게시 실패: ${data.error}`);
            }
        } catch (err: any) {
            toast.error(`게시 오류: ${err.message}`);
        } finally {
            setIsPublishing(null);
        }
    };

    // ─── 상품 검색 ──────────────────────────────────

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`/api/inventory/list?search=${encodeURIComponent(query)}&limit=10`);
            const data = await res.json();
            setSearchResults(data.products || []);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const selectProduct = (product: ProductData) => {
        if (mode === 'single') {
            setSelectedProduct(product);
        } else {
            if (!batchProducts.find(p => p.id === product.id)) {
                setBatchProducts(prev => [...prev, product]);
            }
        }
        setSearchQuery('');
        setSearchResults([]);
        setResults({} as any);
    };

    // ─── 플랫폼/콘텐츠 토글 ────────────────────────

    const togglePlatform = (p: SNSPlatform) => {
        setSelectedPlatforms(prev =>
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    const toggleContentType = (ct: ContentType) => {
        setSelectedContentTypes(prev =>
            prev.includes(ct) ? prev.filter(x => x !== ct) : [...prev, ct]
        );
    };

    // ─── 브랜드 콘텐츠 생성 ─────────────────────────

    const handleBrandGenerate = async () => {
        if (selectedPlatforms.length === 0) {
            toast.error('플랫폼을 선택해주세요');
            return;
        }

        setIsGenerating(true);
        setBrandResults({} as any);
        setProgress({ current: 0, total: selectedPlatforms.length, label: '' });

        for (let i = 0; i < selectedPlatforms.length; i++) {
            const platform = selectedPlatforms[i];
            setProgress({
                current: i + 1,
                total: selectedPlatforms.length,
                label: `${PLATFORMS[platform].nameKr}: ${CONTENT_CATEGORIES[brandCategory].nameKr}`,
            });

            try {
                const res = await fetch('/api/ai/sns-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform,
                        contentType: 'brand-content',
                        contentCategory: brandCategory,
                        topic: brandTopic || undefined,
                    }),
                });
                const data = await res.json();
                if (res.ok) {
                    setBrandResults(prev => ({
                        ...prev,
                        [platform]: {
                            caption: data.caption,
                            hashtags: data.hashtags,
                            title: data.title,
                        },
                    }));
                } else {
                    toast.error(`${PLATFORMS[platform].nameKr} 실패: ${data.error}`);
                }
            } catch (err: any) {
                toast.error(`생성 오류: ${err.message}`);
            }
        }

        setIsGenerating(false);
        setActivePlatformTab(selectedPlatforms[0]);
        toast.success('브랜드 콘텐츠 생성 완료!');
    };

    // ─── 상품 콘텐츠 생성 ───────────────────────────

    const handleGenerate = async () => {
        const products = mode === 'single' ? (selectedProduct ? [selectedProduct] : []) : batchProducts;
        if (products.length === 0) {
            toast.error('상품을 선택해주세요');
            return;
        }
        if (selectedPlatforms.length === 0) {
            toast.error('플랫폼을 선택해주세요');
            return;
        }
        if (selectedContentTypes.length === 0) {
            toast.error('콘텐츠 타입을 선택해주세요');
            return;
        }

        setIsGenerating(true);
        setResults({} as any);

        // 유효한 조합만 필터링
        const ops: Array<{ product: ProductData; platform: SNSPlatform; contentType: ContentType }> = [];
        for (const product of products) {
            for (const platform of selectedPlatforms) {
                const info = PLATFORMS[platform];
                for (const ct of selectedContentTypes) {
                    if (ct === 'editorial-image' && !info.hasImage) continue;
                    if (ct === 'template-card' && !info.hasImage) continue;
                    if (ct === 'blog-html' && !info.hasBlog) continue;
                    ops.push({ product, platform, contentType: ct });
                }
            }
        }

        setProgress({ current: 0, total: ops.length, label: '' });

        for (let i = 0; i < ops.length; i++) {
            const { product, platform, contentType } = ops[i];
            setProgress({
                current: i + 1,
                total: ops.length,
                label: `${PLATFORMS[platform].nameKr}: ${product.brand || ''} ${contentType === 'caption' ? '캡션' : contentType === 'template-card' ? '템플릿' : contentType === 'editorial-image' ? 'AI이미지' : '블로그'}`,
            });

            try {
                const res = await fetch('/api/ai/sns-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product, platform, contentType }),
                });
                const data = await res.json();

                if (res.ok) {
                    setResults(prev => {
                        const existing = prev[platform] || {};
                        const updated = { ...existing };
                        if (contentType === 'editorial-image') updated.editorialImageUrl = data.imageUrl;
                        if (contentType === 'template-card') updated.templateImageUrl = data.imageUrl;
                        if (contentType === 'caption') {
                            updated.caption = data.caption;
                            updated.hashtags = data.hashtags;
                            updated.title = data.title;
                        }
                        if (contentType === 'blog-html') updated.htmlContent = data.htmlContent;
                        return { ...prev, [platform]: updated };
                    });
                } else {
                    toast.error(`${PLATFORMS[platform].nameKr} ${contentType} 실패: ${data.error}`);
                }
            } catch (err: any) {
                toast.error(`생성 오류: ${err.message}`);
            }
        }

        setIsGenerating(false);
        setActivePlatformTab(selectedPlatforms[0]);
        toast.success(`콘텐츠 생성 완료! (${ops.length}건)`);
    };

    // ─── 유틸 ───────────────────────────────────────

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success('클립보드에 복사됨');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const downloadImage = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    const firstImageUrl = (product: ProductData | null) => {
        if (!product?.image_url) return '';
        return product.image_url.split(',')[0].trim();
    };

    // ─── 렌더 ───────────────────────────────────────

    const resultPlatforms = Object.keys(mainTab === 'brand' ? brandResults : results) as SNSPlatform[];
    const activeResults = mainTab === 'brand' ? brandResults : results;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 max-w-6xl mx-auto">
            <Toaster position="top-right" theme="dark" />

            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">SNS 마케팅 콘텐츠 생성기</h1>
                    <p className="text-xs text-slate-500">AI가 브랜드 스토리 / 비하인드 / 상품 콘텐츠를 플랫폼별로 자동 생성합니다</p>
                </div>
                {/* Meta 연결 상태 */}
                {metaStatus && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                        metaStatus.connected && metaStatus.tokenValid
                            ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-900/30 border-red-500/30 text-red-300'
                    }`}>
                        {metaStatus.connected && metaStatus.tokenValid ? (
                            <>
                                <Wifi className="w-3 h-3" />
                                <span>Meta 연결됨</span>
                                {metaStatus.currentPageName && (
                                    <span className="text-emerald-500">({metaStatus.currentPageName})</span>
                                )}
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3" />
                                <span>Meta 미연결</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 메인 탭: 브랜드 콘텐츠 vs 상품 콘텐츠 */}
            <div className="flex gap-1 mb-4 bg-slate-900/50 border border-white/10 rounded-xl p-1">
                <button
                    onClick={() => setMainTab('brand')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${mainTab === 'brand' ? 'bg-gradient-to-r from-pink-600 to-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    📖 브랜드 콘텐츠
                </button>
                <button
                    onClick={() => setMainTab('product')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${mainTab === 'product' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    🏷️ 상품 콘텐츠
                </button>
            </div>

            {/* ═══ 브랜드 콘텐츠 탭 ═══ */}
            {mainTab === 'brand' && (
                <>
                    {/* 콘텐츠 카테고리 */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-4">
                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">콘텐츠 카테고리</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.entries(CONTENT_CATEGORIES) as [ContentCategory, { nameKr: string; desc: string; icon: string }][]).map(([key, info]) => (
                                <button
                                    key={key}
                                    onClick={() => setBrandCategory(key)}
                                    className={`p-3 rounded-lg text-left transition-colors border ${
                                        brandCategory === key
                                            ? 'bg-pink-600/15 border-pink-500/40 text-pink-200'
                                            : 'bg-slate-800/50 border-white/5 text-slate-500 hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="text-lg mb-1">{info.icon}</div>
                                    <div className="text-xs font-bold">{info.nameKr}</div>
                                    <div className="text-[10px] mt-0.5 opacity-70">{info.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 주제 입력 (선택) */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-4">
                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">주제 (선택사항)</p>
                        <input
                            type="text"
                            value={brandTopic}
                            onChange={e => setBrandTopic(e.target.value)}
                            placeholder="예: 90년대 나이키 ACG의 역사, 오늘 100벌 입고 후기, 빈티지 등급 판정 기준..."
                            className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500/50"
                        />
                        <p className="text-[10px] text-slate-600 mt-1.5">비워두면 AI가 자동으로 적합한 주제를 선정합니다</p>
                    </div>
                </>
            )}

            {/* ═══ 상품 콘텐츠 탭: 상품 검색 ═══ */}
            {mainTab === 'product' && (
                <>
            {/* 상품 검색 */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="상품명, 브랜드, 코드로 검색..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />}
                </div>

                {/* 검색 결과 드롭다운 */}
                {searchResults.length > 0 && (
                    <div className="mt-2 bg-slate-800 border border-white/10 rounded-lg max-h-60 overflow-y-auto">
                        {searchResults.map(p => (
                            <button
                                key={p.id}
                                onClick={() => selectProduct(p)}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-700 transition-colors text-left"
                            >
                                {firstImageUrl(p) && (
                                    <img src={firstImageUrl(p)} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-200 truncate">{p.name}</p>
                                    <p className="text-[10px] text-slate-500">{p.brand} · ₩{(p.price_sell || 0).toLocaleString()} · {p.condition}</p>
                                </div>
                                <Plus className="w-4 h-4 text-slate-600 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 모드 탭 + 선택된 상품 */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setMode('single')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${mode === 'single' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    개별 생성
                </button>
                <button
                    onClick={() => setMode('batch')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${mode === 'batch' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    배치 생성
                </button>
            </div>

            {/* 선택된 상품 표시 */}
            {mode === 'single' && selectedProduct && (
                <div className="bg-slate-900/50 border border-pink-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
                    {firstImageUrl(selectedProduct) && (
                        <img src={firstImageUrl(selectedProduct)} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{selectedProduct.name}</p>
                        <p className="text-xs text-slate-400">{selectedProduct.brand} · ₩{(selectedProduct.price_sell || 0).toLocaleString()} · {selectedProduct.condition} · {selectedProduct.size || '-'}</p>
                    </div>
                    <button onClick={() => { setSelectedProduct(null); setResults({} as any); }} className="text-slate-600 hover:text-red-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {mode === 'batch' && batchProducts.length > 0 && (
                <div className="bg-slate-900/50 border border-pink-500/20 rounded-xl p-3 mb-4 space-y-2">
                    <p className="text-xs text-slate-500 font-bold">{batchProducts.length}개 상품 선택됨</p>
                    {batchProducts.map(p => (
                        <div key={p.id} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2">
                            {firstImageUrl(p) && (
                                <img src={firstImageUrl(p)} alt="" className="w-8 h-8 rounded object-cover" />
                            )}
                            <span className="text-xs flex-1 truncate">{p.brand} {p.name}</span>
                            <button onClick={() => setBatchProducts(prev => prev.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 콘텐츠 타입 선택 (상품 탭 전용) */}
            {mainTab === 'product' && (
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">콘텐츠 타입</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'template-card' as ContentType, label: '템플릿 카드', icon: <LayoutTemplate className="w-3 h-3" /> },
                            { key: 'editorial-image' as ContentType, label: 'AI 에디토리얼', icon: <Sparkles className="w-3 h-3" /> },
                            { key: 'caption' as ContentType, label: '캡션 + 해시태그', icon: <Hash className="w-3 h-3" /> },
                            { key: 'blog-html' as ContentType, label: '블로그 HTML', icon: <FileText className="w-3 h-3" /> },
                        ].map(ct => (
                            <button
                                key={ct.key}
                                onClick={() => toggleContentType(ct.key)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                                    selectedContentTypes.includes(ct.key)
                                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                                        : 'bg-slate-800 text-slate-500 border border-white/5 hover:bg-slate-700'
                                }`}
                            >
                                {ct.icon} {ct.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

                </>
            )}

            {/* 플랫폼 선택 (공통) */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">플랫폼 선택</p>
                <div className="flex flex-wrap gap-2">
                    {(Object.entries(PLATFORMS) as [SNSPlatform, PlatformInfo][]).map(([key, info]) => (
                        <button
                            key={key}
                            onClick={() => togglePlatform(key)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                                selectedPlatforms.includes(key)
                                    ? 'bg-pink-600/20 text-pink-300 border border-pink-500/40'
                                    : 'bg-slate-800 text-slate-500 border border-white/5 hover:bg-slate-700'
                            }`}
                        >
                            <span>{info.icon}</span> {info.nameKr}
                        </button>
                    ))}
                </div>
            </div>

            {/* 생성 버튼 */}
            <button
                onClick={mainTab === 'brand' ? handleBrandGenerate : handleGenerate}
                disabled={isGenerating || (mainTab === 'product' && (mode === 'single' ? !selectedProduct : batchProducts.length === 0))}
                className={`w-full py-3 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-6 flex items-center justify-center gap-2 ${
                    mainTab === 'brand'
                        ? 'bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{progress.current}/{progress.total} 생성 중 — {progress.label}</span>
                    </>
                ) : (
                    <>
                        <Megaphone className="w-4 h-4" />
                        {mainTab === 'brand' ? '브랜드 콘텐츠 생성' : '상품 콘텐츠 생성'}
                    </>
                )}
            </button>

            {/* 결과 영역 */}
            {resultPlatforms.length > 0 && (
                <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                    {/* 플랫폼 탭 */}
                    <div className="flex border-b border-white/10 overflow-x-auto">
                        {resultPlatforms.map(p => (
                            <button
                                key={p}
                                onClick={() => setActivePlatformTab(p)}
                                className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
                                    activePlatformTab === p
                                        ? 'bg-pink-600/20 text-pink-300 border-b-2 border-pink-500'
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {PLATFORMS[p].icon} {PLATFORMS[p].nameKr}
                            </button>
                        ))}
                    </div>

                    {/* 결과 콘텐츠 */}
                    {activeResults[activePlatformTab] && (
                        <div className="p-4">
                            <ResultPanel
                                platform={activePlatformTab}
                                result={activeResults[activePlatformTab]}
                                onCopy={copyToClipboard}
                                onDownload={downloadImage}
                                copiedField={copiedField}
                                productName={selectedProduct?.name || batchProducts[0]?.name || ''}
                                metaStatus={metaStatus}
                                isPublishing={isPublishing}
                                onPublish={handlePublish}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── 결과 패널 컴포넌트 ─────────────────────────────

function ResultPanel({ platform, result, onCopy, onDownload, copiedField, productName, metaStatus, isPublishing, onPublish }: {
    platform: SNSPlatform;
    result: PlatformResult;
    onCopy: (text: string, field: string) => void;
    onDownload: (url: string, filename: string) => void;
    copiedField: string | null;
    productName: string;
    metaStatus: MetaStatus | null;
    isPublishing: string | null;
    onPublish: (platform: SNSPlatform, message: string, imageUrl?: string) => void;
}) {
    const [showBlogPreview, setShowBlogPreview] = useState(false);

    const canPublish = META_PLATFORMS.includes(platform) && metaStatus?.connected && metaStatus?.tokenValid;
    const imageUrl = result.editorialImageUrl || result.templateImageUrl;
    const fullMessage = result.caption
        ? result.hashtags?.length
            ? `${result.caption}\n\n${result.hashtags.join(' ')}`
            : result.caption
        : '';

    return (
        <div className="space-y-4">
            {/* Meta 자동 게시 버튼 */}
            {canPublish && fullMessage && (
                <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-blue-400" />
                            <div>
                                <p className="text-xs font-bold text-blue-300">
                                    {PLATFORMS[platform].nameKr}에 바로 게시
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {imageUrl ? '이미지 + 캡션' : '텍스트만'} 게시됩니다
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onPublish(platform, fullMessage, imageUrl)}
                            disabled={isPublishing === platform}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-all"
                        >
                            {isPublishing === platform ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> 게시 중...</>
                            ) : (
                                <><Send className="w-3 h-3" /> 게시하기</>
                            )}
                        </button>
                    </div>
                    {platform === 'instagram-feed' && !imageUrl && (
                        <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Instagram 피드 게시에는 이미지가 필수입니다. 템플릿 카드 또는 AI 이미지를 먼저 생성해주세요.
                        </p>
                    )}
                </div>
            )}

            {/* Meta 미연결 안내 */}
            {META_PLATFORMS.includes(platform) && (!metaStatus?.connected || !metaStatus?.tokenValid) && fullMessage && (
                <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 flex items-center gap-2 text-[10px] text-slate-500">
                    <WifiOff className="w-3 h-3 flex-shrink-0" />
                    <span>Meta API 연결 시 {PLATFORMS[platform].nameKr}에 자동 게시할 수 있습니다</span>
                </div>
            )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 이미지 영역 */}
            <div className="space-y-4">
                {result.templateImageUrl && (
                    <div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                            <LayoutTemplate className="w-3 h-3" /> 템플릿 카드
                        </p>
                        <img src={result.templateImageUrl} alt="Template" className="w-full rounded-lg border border-white/10" />
                        <button
                            onClick={() => onDownload(result.templateImageUrl!, `${platform}-template-${Date.now()}.jpg`)}
                            className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Download className="w-3 h-3" /> 다운로드
                        </button>
                    </div>
                )}

                {result.editorialImageUrl && (
                    <div>
                        <p className="text-[10px] font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI 에디토리얼 이미지
                        </p>
                        <img src={result.editorialImageUrl} alt="Editorial" className="w-full rounded-lg border border-white/10" />
                        <button
                            onClick={() => onDownload(result.editorialImageUrl!, `${platform}-editorial-${Date.now()}.jpg`)}
                            className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Download className="w-3 h-3" /> 다운로드
                        </button>
                    </div>
                )}
            </div>

            {/* 텍스트 영역 */}
            <div className="space-y-4">
                {/* 제목 (당근/번개장터) */}
                {result.title && (
                    <div>
                        <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">제목</p>
                        <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-200 flex items-start justify-between gap-2">
                            <span>{result.title}</span>
                            <button onClick={() => onCopy(result.title!, `title-${platform}`)} className="flex-shrink-0 text-slate-500 hover:text-white">
                                {copiedField === `title-${platform}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* 캡션 */}
                {result.caption && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                                <Type className="w-3 h-3" /> 캡션
                            </p>
                            <button
                                onClick={() => onCopy(result.caption!, `caption-${platform}`)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 font-bold rounded flex items-center gap-1 transition-colors"
                            >
                                {copiedField === `caption-${platform}` ? <><Check className="w-2.5 h-2.5 text-green-400" /> 복사됨</> : <><Copy className="w-2.5 h-2.5" /> 복사</>}
                            </button>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {result.caption}
                        </div>
                    </div>
                )}

                {/* 해시태그 */}
                {result.hashtags && result.hashtags.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                                <Hash className="w-3 h-3" /> 해시태그 ({result.hashtags.length}개)
                            </p>
                            <button
                                onClick={() => onCopy(result.hashtags!.join(' '), `hashtags-${platform}`)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 font-bold rounded flex items-center gap-1 transition-colors"
                            >
                                {copiedField === `hashtags-${platform}` ? <><Check className="w-2.5 h-2.5 text-green-400" /> 복사됨</> : <><Copy className="w-2.5 h-2.5" /> 전체 복사</>}
                            </button>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3 flex flex-wrap gap-1.5">
                            {result.hashtags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-cyan-900/30 text-cyan-300 text-[10px] rounded-full border border-cyan-500/20">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 캡션 + 해시태그 통합 복사 */}
                {result.caption && result.hashtags && result.hashtags.length > 0 && (
                    <button
                        onClick={() => onCopy(`${result.caption}\n\n${result.hashtags!.join(' ')}`, `all-${platform}`)}
                        className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-colors"
                    >
                        {copiedField === `all-${platform}` ? <><Check className="w-3 h-3" /> 전체 복사됨</> : <><Copy className="w-3 h-3" /> 캡션 + 해시태그 통합 복사</>}
                    </button>
                )}

                {/* 블로그 HTML */}
                {result.htmlContent && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold text-orange-400 uppercase flex items-center gap-1">
                                <FileText className="w-3 h-3" /> 블로그 HTML
                            </p>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setShowBlogPreview(!showBlogPreview)}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 font-bold rounded flex items-center gap-1"
                                >
                                    {showBlogPreview ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                    {showBlogPreview ? '접기' : '미리보기'}
                                </button>
                                <button
                                    onClick={() => onCopy(result.htmlContent!, `html-${platform}`)}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 font-bold rounded flex items-center gap-1"
                                >
                                    {copiedField === `html-${platform}` ? <><Check className="w-2.5 h-2.5 text-green-400" /> 복사됨</> : <><Copy className="w-2.5 h-2.5" /> HTML 복사</>}
                                </button>
                            </div>
                        </div>
                        {showBlogPreview && (
                            <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                                <div dangerouslySetInnerHTML={{ __html: result.htmlContent }} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
