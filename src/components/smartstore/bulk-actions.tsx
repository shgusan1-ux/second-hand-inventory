'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    X, CheckCircle2,
    ArrowRightLeft, Tag, Trash2,
    LayoutGrid, ChevronDown
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionsProps {
    selectedCount: number;
    onClear: () => void;
    onAction: (action: string) => void;
}

export function BulkActions({ selectedCount, onClear, onAction }: BulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="bg-indigo-600 text-white rounded-xl p-3 flex items-center justify-between shadow-lg shadow-indigo-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={onClear}>
                    <X className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{selectedCount}</span>
                    <span className="text-sm opacity-80">개 상품 선택됨</span>
                </div>
                <div className="h-4 w-[1px] bg-white/30 hidden md:block"></div>
                <div className="hidden md:flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-bold bg-white/10 hover:bg-white/20" onClick={() => onAction('CURATED')}>CURATED 이동</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-bold bg-white/10 hover:bg-white/20" onClick={() => onAction('ARCHIVE')}>ARCHIVE 이동</Button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 gap-2 bg-white/20 hover:bg-white/30 font-bold">
                            더 보기 <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>일괄 작업 선택</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onAction('MOVE')}>
                            <LayoutGrid className="w-4 h-4 text-slate-400" /> 카테고리 이동
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onAction('TAG')}>
                            <Tag className="w-4 h-4 text-slate-400" /> 태그 최적화
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onAction('STATUS')}>
                            <CheckCircle2 className="w-4 h-4 text-slate-400" /> 판매상태 변경
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 focus:text-red-600" onClick={() => onAction('DELETE')}>
                            <Trash2 className="w-4 h-4" /> 목록에서 제외
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
