
'use client';

import { Button } from "@/components/ui/button";
import {
    X, CheckCircle2,
    Tag, Trash2,
    LayoutGrid, ChevronDown,
    Zap, Archive, Clock, AlertTriangle
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal
} from "@/components/ui/dropdown-menu";

interface BulkActionsProps {
    selectedCount: number;
    onClear: () => void;
    onAction: (action: string) => void;
}

export function BulkActions({ selectedCount, onClear, onAction }: BulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 ring-1 ring-slate-800">
            <div className="flex items-center gap-6">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                    onClick={onClear}
                >
                    <X className="w-5 h-5" />
                </Button>

                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-indigo-400 font-outfit">{selectedCount}</span>
                        <span className="text-sm font-bold text-slate-300">items selected</span>
                    </div>
                </div>

                <div className="h-8 w-[1px] bg-slate-800 hidden md:block mx-2"></div>

                <div className="hidden md:flex gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 px-4 text-xs font-extrabold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20"
                        onClick={() => onAction('NEW')}
                    >
                        NEW 이동
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 px-4 text-xs font-extrabold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20"
                        onClick={() => onAction('CURATED')}
                    >
                        CURATED 이동
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-10 px-4 text-xs font-extrabold bg-slate-700/50 text-slate-300 hover:bg-slate-700/80 rounded-xl border border-slate-600/50 gap-2"
                            >
                                <Archive className="w-3.5 h-3.5" /> ARCHIVE ▼
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-slate-900 border-slate-800 text-slate-300 shadow-2xl">
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800" onClick={() => onAction('ARCHIVE_MILITARY')}>MILITARY</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800" onClick={() => onAction('ARCHIVE_WORKWEAR')}>WORKWEAR</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800" onClick={() => onAction('ARCHIVE_JAPAN')}>JAPAN</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800" onClick={() => onAction('ARCHIVE_EUROPE')}>EUROPE</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800" onClick={() => onAction('ARCHIVE_BRITISH')}>BRITISH</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 px-4 text-xs font-extrabold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl border border-amber-500/20"
                        onClick={() => onAction('CLEARANCE')}
                    >
                        CLEARANCE 이동
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-10 gap-2 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl font-bold px-4">
                            고급 작업 <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200">
                        <DropdownMenuLabel>일괄 데이터 최적화</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer py-2.5" onClick={() => onAction('OPTIMIZE_TAGS')}>
                            <Zap className="w-4 h-4 text-amber-500" /> AI 태그 자동 추천
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer py-2.5" onClick={() => onAction('EXPORT_CSV')}>
                            <LayoutGrid className="w-4 h-4 text-emerald-500" /> CSV로 추출 (VLOOKUP용)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 focus:text-red-600 py-2.5" onClick={() => onAction('DELETE')}>
                            <AlertTriangle className="w-4 h-4" /> 선택 항목 숨김 처리
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
