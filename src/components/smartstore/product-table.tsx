'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Brain, Edit2, ShieldCheck,
    ArrowUpRight, Clock, Box,
    ChevronRight, Info
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

interface ProductTableProps {
    products: any[];
    isLoading: boolean;
    selectedIds: string[];
    onSelectChange: (ids: string[]) => void;
    onAnalyzeVision: (data: any) => void;
    onUpdate: (id: string, data: any) => void;
}

export function ProductTable({
    products,
    isLoading,
    selectedIds,
    onSelectChange,
    onAnalyzeVision,
    onUpdate
}: ProductTableProps) {

    const calculateDays = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const handleVisionAnalyze = async (product: any) => {
        try {
            toast.info(`${product.name} AI 분석을 시도합니다...`);
            const res = await fetch('/api/vision/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: product.images.representativeImage.url })
            });
            const result = await res.json();
            if (result.success) {
                onAnalyzeVision({ product, analysis: result.data });
                toast.success('AI 분석 완료');
            }
        } catch (e) {
            toast.error('AI 분석 실패');
        }
    };

    const handleOverrideDate = async (id: string, date: string) => {
        try {
            const res = await fetch('/api/smartstore/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, overrideDate: date })
            });
            if ((await res.json()).success) {
                toast.success('기준일 수정 완료');
                onUpdate(id, { overrideDate: date });
            }
        } catch (e) {
            toast.error('수정 실패');
        }
    };

    return (
        <TooltipProvider>
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={products.length > 0 && selectedIds.length === products.length}
                                    onCheckedChange={(checked) => {
                                        if (checked) onSelectChange(products.map(p => p.originProductNo));
                                        else onSelectChange([]);
                                    }}
                                />
                            </TableHead>
                            <TableHead className="w-[80px]">이미지</TableHead>
                            <TableHead className="min-w-[240px]">상품 상세 정보</TableHead>
                            <TableHead>관리 지표 (등록/경과)</TableHead>
                            <TableHead>AI 분류 추천</TableHead>
                            <TableHead className="text-right">액션</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="h-60 text-center text-slate-400">데이터를 불러오는 중...</TableCell></TableRow>
                        ) : products.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-40 text-center text-slate-400">표시할 상품이 없습니다.</TableCell></TableRow>
                        ) : (
                            products.map((p) => (
                                <TableRow key={p.originProductNo} className={`group ${selectedIds.includes(p.originProductNo) ? 'bg-indigo-50/30' : ''}`}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(p.originProductNo)}
                                            onCheckedChange={(checked) => {
                                                if (checked) onSelectChange([...selectedIds, p.originProductNo]);
                                                else onSelectChange(selectedIds.filter(id => id !== p.originProductNo));
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border bg-slate-100 ring-offset-2 ring-indigo-500 transition-all group-hover:ring-2">
                                            <img
                                                src={p.images.representativeImage.url}
                                                alt={p.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{p.name}</span>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                                <span>{p.originProductNo}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>{p.sellerManagementCode || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-100 text-slate-600">
                                                    현재: {p.currentInternalCategory || '미분류'}
                                                </Badge>
                                                {p.stockQuantity === 1 && (
                                                    <Badge className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200">품절임박</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5 font-medium">
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(p.regDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="date"
                                                        className="h-6 text-[10px] p-1 w-28"
                                                        value={p.overrideDate ? p.overrideDate.split('T')[0] : ''}
                                                        onChange={(e) => handleOverrideDate(p.originProductNo, e.target.value)}
                                                    />
                                                    <span className="text-[11px] font-extrabold text-indigo-600">D+{calculateDays(p.overrideDate || p.regDate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`text-[10px] font-bold ${p.recommendation.category === 'NEW' ? 'bg-emerald-500' :
                                                        p.recommendation.category === 'CURATED' ? 'bg-indigo-500' :
                                                            p.recommendation.category === 'ARCHIVE' ? 'bg-slate-700' : 'bg-amber-500'
                                                    }`}>
                                                    {p.recommendation.category}
                                                </Badge>
                                                {p.recommendation.subCategory && (
                                                    <Badge variant="outline" className="text-[10px] border-slate-300">
                                                        {p.recommendation.subCategory}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-help">
                                                        <Brain className="w-3 h-3 text-indigo-400" />
                                                        <span>AI 분석 점수: {p.recommendation.score}%</span>
                                                        <Info className="w-2.5 h-2.5" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="w-[200px] text-[10px] p-3 space-y-1 bg-slate-900 border-none text-white shadow-xl">
                                                    <p className="font-bold text-indigo-300">분류 근거</p>
                                                    <p className="leading-relaxed opacity-80">{p.recommendation.reasoning}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => handleVisionAnalyze(p)}>
                                                <Brain className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}
