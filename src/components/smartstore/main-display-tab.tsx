'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { calculateSalesScore } from '@/lib/smartstore-rank';
import { getMarketWeather } from '@/lib/weather';
import { useArchiveSettings } from '@/hooks/use-archive-settings';

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
        size: string;
        clothingType: string;
        clothingSubType: string;
        confidence: number;
        visionGrade?: string;
    };
    descriptionGrade?: string | null;
}

interface MainDisplayTabProps {
    products: Product[];
    forcedCategory?: 'NEW' | 'CURATED' | 'ARCHIVE';
    onSyncExhibition?: (category: string, ids: string[]) => Promise<void>;
    syncingDisplay?: boolean;
}

export function MainDisplayTab({ products, forcedCategory, onSyncExhibition, syncingDisplay }: MainDisplayTabProps) {
    const { categories: archiveCategories } = useArchiveSettings();
    const ARCHIVE_SUBS = useMemo(() => archiveCategories.map(c => c.category_id), [archiveCategories]);
    const isArchiveCategory = (cat?: string) => cat === 'ARCHIVE' || ARCHIVE_SUBS.includes(cat || '');

    const [internalCategory, setInternalCategory] = useState<'NEW' | 'CURATED' | 'ARCHIVE'>('NEW');
    const [currentTemp, setCurrentTemp] = useState<number>(20);
    const [pageSize, setPageSize] = useState<number>(30);
    const activeCategory = forcedCategory || internalCategory;

    // 실시간 날씨/온도 가져오기
    useEffect(() => {
        getMarketWeather().then(weather => {
            setCurrentTemp(weather.averageTemp);
        }).catch(() => {
            // 기본값 20도 유지
        });
    }, []);

    const selectedProducts = useMemo(() => {
        // 1. 카테고리별 필터링
        const filtered = products.filter(p => {
            // 키즈 제외
            if (p.classification?.gender === 'KIDS') return false;

            const cat = p.internalCategory || '';
            if (activeCategory === 'NEW') return cat === 'NEW';
            if (activeCategory === 'CURATED') return cat === 'CURATED';
            if (activeCategory === 'ARCHIVE') return isArchiveCategory(cat);
            return false;
        });

        // 2. 알고리즘 기반 점수 산정 (온도 반영) 및 정렬
        return filtered
            .map(p => ({ ...p, _score: calculateSalesScore(p as any, currentTemp) }))
            .sort((a, b) => b._score - a._score)
            .slice(0, pageSize); // 선택된 개수만큼
    }, [products, activeCategory, currentTemp, pageSize, ARCHIVE_SUBS]);

    const handleCopyCodes = () => {
        const codes = selectedProducts.map(p => p.sellerManagementCode || p.originProductNo).filter(Boolean);
        if (codes.length === 0) {
            toast.error('복사할 상품코드가 없습니다.');
            return;
        }
        navigator.clipboard.writeText(codes.join('\n'));
        toast.success(`${activeCategory} 상위 ${selectedProducts.length}개 상품코드 복사 완료`);
    };

    const handleSyncNaver = async () => {
        if (!onSyncExhibition) return;
        const ids = selectedProducts.map(p => p.originProductNo);
        if (ids.length === 0) {
            toast.error('진열할 상품이 없습니다.');
            return;
        }

        if (!confirm(`${activeCategory} 상위 ${ids.length}개 상품을 네이버 스마트스토어 메인에 진열하시겠습니까?`)) return;

        try {
            await onSyncExhibition(activeCategory, ids);
        } catch (err) {
            // Error managed by parent toast
        }
    };

    return (
        <div className="space-y-6">
            {/* 카테고리 선택 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {!forcedCategory ? (
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        {(['NEW', 'CURATED', 'ARCHIVE'] as const).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setInternalCategory(cat)}
                                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeCategory === cat
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 px-3 py-1 bg-slate-100 rounded-lg uppercase tracking-wider">{activeCategory}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Main Display Recommendation</span>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* 개수 선택 */}
                    <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl">
                        {[30, 50, 100].map(size => (
                            <button
                                key={size}
                                onClick={() => setPageSize(size)}
                                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-black rounded-lg transition-all ${pageSize === size
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-sm">
                        <span className="text-base sm:text-lg">
                            {currentTemp < 10 ? '❄️' : currentTemp < 20 ? '🌤' : '☀️'}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 leading-none">온도</span>
                            <span className="text-xs sm:text-sm font-black text-slate-700">{currentTemp}°C</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSyncNaver}
                        disabled={syncingDisplay}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-lg ${syncingDisplay ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        {syncingDisplay ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                        <span className="whitespace-nowrap">{syncingDisplay ? '진열 중' : '네이버 진열'}</span>
                    </button>

                    <button
                        onClick={handleCopyCodes}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                    >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span className="whitespace-nowrap">코드 복사</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {selectedProducts.map((p, idx) => (
                    <div
                        key={p.originProductNo}
                        className="relative group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ag-float-1 cursor-pointer"
                        onClick={() => {
                            if (p.channelProductNo) {
                                window.open(`https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}`, '_blank');
                            }
                        }}
                    >
                        {/* 순위 배지 */}
                        <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg ${idx < 3 ? 'bg-amber-400 text-amber-900' : 'bg-white/90 text-slate-900'
                            }`}>
                            {idx + 1}
                        </div>

                        {/* 점수 배지 */}
                        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded-md text-[8px] text-white font-bold">
                            ★ {Math.round((p as any)._score)}
                        </div>

                        <div className="aspect-[3/4] relative overflow-hidden bg-slate-50">
                            {p.thumbnailUrl ? (
                                <img
                                    src={p.thumbnailUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}

                            {/* 하단 브랜드 / 정보 */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2">
                                <p className="text-[8px] text-white/70 font-bold uppercase tracking-wider mb-0.5 truncate">
                                    {p.classification?.brand || 'UNKNOWN'}
                                </p>
                                <p className="text-white text-[10px] font-bold line-clamp-1">
                                    {p.name}
                                </p>
                            </div>
                        </div>

                        <div className="p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900">
                                    {p.salePrice.toLocaleString()}원
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${p.classification?.brandTier === 'LUXURY' ? 'bg-amber-100 text-amber-700' :
                                    p.classification?.brandTier === 'PREMIUM' ? 'bg-violet-100 text-violet-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {p.classification?.brandTier || 'NORMAL'}
                                </span>
                                <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                                    {p.classification?.visionGrade || (p.descriptionGrade ? `${p.descriptionGrade}급` : 'B급')}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {selectedProducts.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">해당 카테고리에 진열할 상품이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
