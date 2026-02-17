'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useArchiveSettings, type ArchiveCategory } from '@/hooks/use-archive-settings';

interface CustomBrand {
    id: number;
    brand_name: string;
    brand_name_ko: string;
    tier: string;
    aliases: string;
    country: string;
    notes: string;
    is_active: boolean;
}

interface ArchiveManagementModalProps {
    open: boolean;
    onClose: () => void;
    onRefresh?: () => void;
}

export function ArchiveManagementModal({ open, onClose, onRefresh }: ArchiveManagementModalProps) {
    const { categories: archiveCategories, updateCategory, loading: categoriesLoading, refresh: refreshCategories } = useArchiveSettings();
    const [brands, setBrands] = useState<CustomBrand[]>([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editingCatName, setEditingCatName] = useState('');
    const [showAddBrand, setShowAddBrand] = useState(false);
    const [newBrand, setNewBrand] = useState({ brand_name: '', brand_name_ko: '', tier: 'OTHER', aliases: '', country: '', notes: '' });

    const TIERS = useMemo(() => [
        ...archiveCategories.map(c => c.category_id),
        'OTHER'
    ], [archiveCategories]);

    const TIER_LABELS = useMemo(() => {
        const map: Record<string, string> = { OTHER: '기타 (OTHER)' };
        archiveCategories.forEach(c => {
            map[c.category_id] = c.display_name;
        });
        return map;
    }, [archiveCategories]);

    const loadBrands = async () => {
        setBrandsLoading(true);
        try {
            const res = await fetch('/api/smartstore/brands');
            const data = await res.json();
            if (data.success) {
                setBrands(data.brands || []);
            }
        } catch (e) {
            console.error('브랜드 로드 실패:', e);
        }
        setBrandsLoading(false);
    };

    useEffect(() => {
        if (open) {
            loadBrands();
            refreshCategories();
        }
    }, [open, refreshCategories]);

    const handleAddBrand = async () => {
        if (!newBrand.brand_name.trim()) {
            toast.error('브랜드명을 입력해주세요');
            return;
        }
        try {
            const res = await fetch('/api/smartstore/brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBrand),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('브랜드 추가 완료');
                setNewBrand({ brand_name: '', brand_name_ko: '', tier: 'OTHER', aliases: '', country: '', notes: '' });
                setShowAddBrand(false);
                loadBrands();
                onRefresh?.();
            } else {
                toast.error(data.error || '추가 실패');
            }
        } catch (e: any) {
            toast.error('오류: ' + e.message);
        }
    };

    const handleDeleteBrand = async (id: number) => {
        if (!confirm('이 브랜드를 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/smartstore/brands?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('브랜드 삭제 완료');
                loadBrands();
                onRefresh?.();
            } else {
                toast.error(data.error || '삭제 실패');
            }
        } catch (e: any) {
            toast.error('오류: ' + e.message);
        }
    };

    const handlePopulateBrands = async () => {
        if (!confirm('AI가 분석한 최신 패션 트렌드와 아카이브 브랜드 목록(약 20개 내외)을 자동으로 등록하시겠습니까?')) return;

        setBrandsLoading(true);
        try {
            const res = await fetch('/api/cron/collect-brands?force=true');
            const data = await res.json();
            if (data.success) {
                toast.success(`AI가 ${data.collectedCount}개의 새로운 브랜드를 찾아냈습니다!`);
                loadBrands();
            } else {
                toast.error(data.error || '등록 실패');
            }
        } catch (e: any) {
            toast.error('오류: ' + e.message);
        } finally {
            setBrandsLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 leading-tight">아카이브 마스터 설정</h2>
                            <p className="text-sm font-bold text-slate-400">카테고리명 편집 및 브랜드 마스터 관리</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* 카테고리 관리 */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                            아카이브 카테고리 관리
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {archiveCategories.map((cat) => (
                                <div key={cat.category_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                                    <div className="flex flex-col gap-1">
                                        {editingCatId === cat.category_id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    value={editingCatName}
                                                    onChange={e => setEditingCatName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            updateCategory(cat.category_id, editingCatName, cat.sort_order).then(success => {
                                                                if (success) {
                                                                    toast.success('카테고리명이 수정되었습니다.');
                                                                    setEditingCatId(null);
                                                                    onRefresh?.();
                                                                }
                                                            });
                                                        }
                                                        if (e.key === 'Escape') setEditingCatId(null);
                                                    }}
                                                    className="flex-1 text-sm font-black border-b border-blue-500 bg-transparent outline-none pb-0.5"
                                                />
                                                <button
                                                    onClick={() => {
                                                        updateCategory(cat.category_id, editingCatName, cat.sort_order).then(success => {
                                                            if (success) {
                                                                toast.success('카테고리명이 수정되었습니다.');
                                                                setEditingCatId(null);
                                                                onRefresh?.();
                                                            }
                                                        });
                                                    }}
                                                    className="text-white bg-blue-500 rounded-lg p-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm font-black text-slate-800">{cat.display_name}</span>
                                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{cat.category_id}</span>
                                                <button
                                                    onClick={() => { setEditingCatId(cat.category_id); setEditingCatName(cat.display_name); }}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-500"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 브랜드 마스터 관리 */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                브랜드 마스터 리스트
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePopulateBrands}
                                    disabled={brandsLoading}
                                    className="px-4 py-2 rounded-xl text-xs font-black transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                    인기 브랜드 자동등록
                                </button>
                                <button
                                    onClick={() => setShowAddBrand(!showAddBrand)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${showAddBrand ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg'}`}
                                >
                                    {showAddBrand ? '취소' : '+ 새 브랜드'}
                                </button>
                            </div>
                        </div>

                        {showAddBrand && (
                            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 ml-1">브랜드명 (영문)</label>
                                        <input
                                            placeholder="BARBOUR"
                                            value={newBrand.brand_name}
                                            onChange={e => setNewBrand(prev => ({ ...prev, brand_name: e.target.value.toUpperCase() }))}
                                            className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 ml-1">브랜드명 (한글)</label>
                                        <input
                                            placeholder="바버"
                                            value={newBrand.brand_name_ko}
                                            onChange={e => setNewBrand(prev => ({ ...prev, brand_name_ko: e.target.value }))}
                                            className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 ml-1">소속 카테고리</label>
                                        <select
                                            value={newBrand.tier}
                                            onChange={e => setNewBrand(prev => ({ ...prev, tier: e.target.value }))}
                                            className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                        >
                                            {TIERS.map(t => (
                                                <option key={t} value={t}>{TIER_LABELS[t]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 ml-1">별칭 (쉼표 구분)</label>
                                        <input
                                            placeholder="BEDALE, BEAUFORT"
                                            value={newBrand.aliases}
                                            onChange={e => setNewBrand(prev => ({ ...prev, aliases: e.target.value }))}
                                            className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddBrand}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
                                >
                                    브랜드 추가하기
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {brandsLoading ? (
                                <div className="col-span-full flex items-center justify-center py-20">
                                    <div className="w-8 h-8 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
                                </div>
                            ) : brands.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-slate-400 font-bold">등록된 브랜드가 없습니다.</div>
                            ) : (
                                brands.map(brand => (
                                    <div key={brand.id} className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl hover:border-slate-300 transition-all group flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${brand.tier === 'MILITARY' ? 'bg-green-100 text-green-700' :
                                                    brand.tier === 'WORKWEAR' ? 'bg-amber-100 text-amber-700' :
                                                        brand.tier === 'JAPAN' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {TIER_LABELS[brand.tier] || brand.tier}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteBrand(brand.id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900">{brand.brand_name}</h4>
                                            {brand.brand_name_ko && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{brand.brand_name_ko}</p>}
                                        </div>
                                        {brand.aliases && (
                                            <div className="mt-3 pt-3 border-t border-slate-50">
                                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-1">Aliases</p>
                                                <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{brand.aliases}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
