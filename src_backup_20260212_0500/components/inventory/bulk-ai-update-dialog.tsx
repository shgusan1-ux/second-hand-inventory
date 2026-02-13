'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { bulkUpdateProductsAI } from '@/lib/actions';
import { toast } from 'sonner';

interface BulkAiUpdateDialogProps {
    selectedIds: string[];
    onSuccess: () => void;
}

export function BulkAiUpdateDialog({ selectedIds, onSuccess }: BulkAiUpdateDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState({
        grade: true,
        price: true,
        description: false,
        name: false,
    });
    const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            // Call Real Server Action
            const res = await bulkUpdateProductsAI(selectedIds, options);

            if (res.success) {
                setResult({
                    success: selectedIds.length,
                    failed: 0
                });

                // Close after delay
                setTimeout(() => {
                    setOpen(false);
                    setResult(null);
                    onSuccess();
                    toast.success(`${res.count}개 상품이 AI 보정되었습니다.`);
                }, 1500);
            } else {
                toast.error(res.error || 'AI 작업 실패');
            }

        } catch (error) {
            console.error('AI Update failed', error);
            toast.error('AI 작업 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all shadow-sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 일괄 보정 ({selectedIds.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        AI 일괄 상품 보정
                    </DialogTitle>
                    <DialogDescription>
                        선택한 {selectedIds.length}개 상품에 대해 AI 분석을 실행합니다.
                        <br />
                        원하는 작업을 선택해주세요.
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <Checkbox
                                id="opt-grade"
                                checked={options.grade}
                                onCheckedChange={(c) => setOptions(prev => ({ ...prev, grade: !!c }))}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="opt-grade" className="font-medium cursor-pointer">등급 자동 판정</Label>
                                <p className="text-xs text-muted-foreground">이미지 분석을 통해 상품 등급(S/A/B)을 판정합니다.</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <Checkbox
                                id="opt-price"
                                checked={options.price}
                                onCheckedChange={(c) => setOptions(prev => ({ ...prev, price: !!c }))}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="opt-price" className="font-medium cursor-pointer">AI 가격 제안</Label>
                                <p className="text-xs text-muted-foreground">브랜드와 상태를 기반으로 적정 판매가를 제안합니다.</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <Checkbox
                                id="opt-desc"
                                checked={options.description}
                                onCheckedChange={(c) => setOptions(prev => ({ ...prev, description: !!c }))}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="opt-desc" className="font-medium cursor-pointer">상세 설명 생성</Label>
                                <p className="text-xs text-muted-foreground">상품 특징을 요약하여 매력적인 설명을 작성합니다.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                        <h3 className="text-lg font-medium">작업 완료!</h3>
                        <p className="text-muted-foreground">{result.success}개 상품이 성공적으로 업데이트되었습니다.</p>
                    </div>
                )}

                <DialogFooter>
                    {!result && (
                        <Button onClick={handleUpdate} disabled={isLoading || (!options.grade && !options.price && !options.description)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    AI 분석 중...
                                </>
                            ) : (
                                '일괄 보정 시작'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
