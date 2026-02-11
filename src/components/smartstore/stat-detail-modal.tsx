'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface Product {
    originProductNo: string;
    name: string;
    thumbnailUrl?: string | null;
    classification?: {
        brand: string;
        brandTier: string;
        confidence: number;
    };
    internalCategory?: string;
}

interface StatDetailModalProps {
    type: 'HIGH_CONFIDENCE' | 'LOW_CONFIDENCE' | 'ALL';
    products: Product[];
    onClose: () => void;
    onRefresh: () => void;
}

const tierLabel: Record<string, string> = {
    MILITARY: 'MILITARY ARCHIVE',
    WORKWEAR: 'WORKWEAR ARCHIVE',
    OUTDOOR: 'OUTDOOR ARCHIVE',
    JAPAN: 'JAPAN ARCHIVE',
    HERITAGE: 'HERITAGE ARCHIVE',
    BRITISH: 'BRITISH ARCHIVE',
    UNCATEGORIZED: 'UNCATEGORIZED'
};

export function StatDetailModal({ type, products, onClose, onRefresh }: StatDetailModalProps) {
    const title = type === 'HIGH_CONFIDENCE' ? '고신뢰 상품 목록 (70% 이상)' : type === 'LOW_CONFIDENCE' ? '저신뢰 상품 목록 (40% 미만)' : '전체 상품';

    // Filter products
    const filtered = products.filter(p => {
        const conf = p.classification?.confidence || 0;
        if (type === 'HIGH_CONFIDENCE') return conf >= 70;
        if (type === 'LOW_CONFIDENCE') return conf < 40;
        return true;
    });

    const [editingState, setEditingState] = useState<Record<string, { name: string; category: string }>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const handleEditChange = (id: string, field: 'name' | 'category', value: string) => {
        setEditingState(prev => ({
            ...prev,
            [id]: {
                name: prev[id]?.name ?? products.find(p => p.originProductNo === id)?.name ?? '',
                category: prev[id]?.category ?? products.find(p => p.originProductNo === id)?.internalCategory ?? 'UNCATEGORIZED',
                [field]: value
            }
        }));
    };

    const handleSave = async (product: Product) => {
        const id = product.originProductNo;
        const state = editingState[id];

        // If no changes, do nothing
        if (!state) return;

        setSavingId(id);
        try {
            const res = await fetch('/api/smartstore/products/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    name: state.name,
                    category: state.category // Should map to internalCategory value
                })
            });

            if (res.ok) {
                toast.success('수정되었습니다.');
                // Remove from editing state to reflect "saved"
                const next = { ...editingState };
                delete next[id];
                setEditingState(next);
                onRefresh(); // Refresh parent data
            } else {
                toast.error('저장 실패');
            }
        } catch (e) {
            toast.error('저장 중 오류 발생');
        } finally {
            setSavingId(null);
        }
    };

    const categories = [
        'UNCATEGORIZED',
        'MILITARY ARCHIVE',
        'WORKWEAR ARCHIVE',
        'OUTDOOR ARCHIVE',
        'JAPAN ARCHIVE',
        'HERITAGE ARCHIVE',
        'BRITISH ARCHIVE'
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-[90vw] max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                        <p className="text-xs text-slate-500 mt-1">총 {filtered.length}개 상품</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="grid gap-3">
                        {filtered.map(p => {
                            const isEditing = !!editingState[p.originProductNo];
                            const currentName = editingState[p.originProductNo]?.name ?? p.name;
                            const currentCategory = editingState[p.originProductNo]?.category ?? p.internalCategory ?? 'UNCATEGORIZED';
                            const isSaving = savingId === p.originProductNo;

                            return (
                                <div key={p.originProductNo} className="bg-white p-3 rounded-xl border hover:shadow-md transition-all flex gap-4 items-center group">
                                    {/* Image */}
                                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100 relative">
                                        {p.thumbnailUrl ? (
                                            <img src={p.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-[10px] text-slate-400">NO IMG</div>
                                        )}
                                        <div className="absolute top-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-bl font-bold backdrop-blur-sm">
                                            {p.classification?.confidence ?? 0}%
                                        </div>
                                    </div>

                                    {/* Edit Form */}
                                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_180px_auto] gap-4 items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded">#{p.originProductNo}</span>
                                                {p.classification?.brand && (
                                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{p.classification.brand}</span>
                                                )}
                                            </div>
                                            <input
                                                className="w-full text-sm font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent focus:bg-slate-50 px-1 py-0.5 transition-colors outline-none truncate"
                                                value={currentName}
                                                onChange={e => handleEditChange(p.originProductNo, 'name', e.target.value)}
                                                placeholder="상품명 입력"
                                            />
                                        </div>

                                        <div>
                                            <select
                                                className="w-full text-[11px] font-medium text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={currentCategory}
                                                onChange={e => handleEditChange(p.originProductNo, 'category', e.target.value)}
                                            >
                                                {categories.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => handleSave(p)}
                                            disabled={!isEditing || isSaving}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditing
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                }`}
                                        >
                                            {isSaving ? '저장...' : '저장'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="text-center py-20 text-slate-400 text-sm">해당하는 상품이 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
