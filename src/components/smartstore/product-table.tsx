
'use client';

import { memo, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Brain, ArrowUpRight, Clock, Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

interface ProductRowProps {
    p: any;
    isSelected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onAnalyzeVision: (p: any) => void;
    onUpdate: (id: string, date: string) => void;
}

const ProductRow = memo(({ p, isSelected, onSelect, onAnalyzeVision, onUpdate }: ProductRowProps) => {
    const calculateDays = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    };

    return (
        <div className={`flex items-center w-full border-b hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`} style={{ height: '80px' }}>
            <div className="w-12 flex justify-center items-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(p.originProductNo, !!checked)}
                />
            </div>
            <div className="w-20 px-2">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border bg-slate-100">
                    <img
                        src={p.thumbnailUrl || undefined}
                        alt={p.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
            <div className="flex-1 min-w-0 px-4">
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-slate-900 line-clamp-1">{p.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{p.originProductNo}</span>
                        <span>{p.sellerManagementCode || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {p.internalCategory || '미분류'}
                        </Badge>
                    </div>
                </div>
            </div>
            <div className="w-48 px-4">
                <div className="flex flex-col gap-1 font-medium">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(p.regDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            className="h-6 text-[10px] p-1 w-28"
                            value={p.overrideDate || p.lifecycle?.overrideDate || ''}
                            onChange={(e) => onUpdate(p.originProductNo, e.target.value)}
                        />
                        <span className="text-[11px] font-extrabold text-indigo-600">D+{calculateDays(p.lifecycle?.overrideDate || p.regDate)}</span>
                    </div>
                </div>
            </div>
            <div className="w-48 px-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] font-bold ${p.lifecycle?.stage === 'NEW' ? 'bg-emerald-500' :
                                p.lifecycle?.stage === 'CURATED' ? 'bg-indigo-500' :
                                    p.lifecycle?.stage === 'ARCHIVE' ? 'bg-slate-700' : 'bg-amber-500'
                            }`}>
                            {p.lifecycle?.stage}
                        </Badge>
                        {p.archiveInfo?.category && (
                            <Badge variant="outline" className="text-[10px] border-slate-300">
                                {p.archiveInfo.category}
                            </Badge>
                        )}
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-help">
                                    <Brain className="w-3 h-3 text-indigo-400" />
                                    <span>AI: {p.archiveInfo?.score || 0}%</span>
                                    <Info className="w-2.5 h-2.5" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-[200px] text-[10px] p-3 bg-slate-900 border-none text-white">
                                <p className="font-bold text-indigo-300">분류 근거</p>
                                <p className="leading-relaxed opacity-80">
                                    {p.archiveInfo ? `텍스트 매칭: ${p.archiveInfo.breakdown.textMatches.join(', ')} (${p.archiveInfo.breakdown.textScore}%)` : '수동 분류 또는 미분류'}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            <div className="w-24 px-4 text-right">
                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => onAnalyzeVision(p)}>
                        <Brain className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

ProductRow.displayName = 'ProductRow';

interface ProductTableProps {
    products: any[];
    isLoading: boolean;
    selectedIds: string[];
    onSelectChange: (ids: string[]) => void;
    onAnalyzeVision: (data: any) => void;
    onUpdate: (id: string, date: string) => void;
}

export function ProductTable({
    products,
    isLoading,
    selectedIds,
    onSelectChange,
    onAnalyzeVision,
    onUpdate
}: ProductTableProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: products.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 10,
    });

    const handleSelect = (id: string, checked: boolean) => {
        if (checked) onSelectChange([...selectedIds, id]);
        else onSelectChange(selectedIds.filter(selectedId => selectedId !== id));
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) onSelectChange(products.map(p => p.originProductNo));
        else onSelectChange([]);
    };

    return (
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col h-[700px]">
            {/* Header */}
            <div className="flex items-center w-full bg-slate-50 border-b font-semibold text-slate-500 text-xs py-3 uppercase tracking-wider">
                <div className="w-12 flex justify-center">
                    <Checkbox
                        checked={products.length > 0 && selectedIds.length === products.length}
                        onCheckedChange={handleSelectAll}
                    />
                </div>
                <div className="w-20 px-2">이미지</div>
                <div className="flex-1 px-4">상품 상세 정보</div>
                <div className="w-48 px-4">관리 지표 (등록/경과)</div>
                <div className="w-48 px-4">AI 분류 추천</div>
                <div className="w-24 px-4 text-right">액션</div>
            </div>

            {/* Body (Virtualized) */}
            <div
                ref={parentRef}
                className="flex-1 overflow-auto scrollbar-hide"
            >
                {products.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                            <Info className="w-6 h-6" />
                        </div>
                        <p>표시할 상품이 없습니다.</p>
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const p = products[virtualRow.index];
                            if (!p) return null;
                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <ProductRow
                                        p={p}
                                        isSelected={selectedIds.includes(p.originProductNo)}
                                        onSelect={handleSelect}
                                        onAnalyzeVision={onAnalyzeVision}
                                        onUpdate={onUpdate}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="bg-white/50 backdrop-blur-sm absolute inset-0 flex items-center justify-center z-10">
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-xl border">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-bold text-slate-600 tracking-tighter">데이터 처리 중...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
