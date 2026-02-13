'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { bulkUpdateProducts } from '@/lib/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface BulkEditDialogProps {
    open: boolean;
    onClose: () => void;
    selectedIds: string[];
    categories: { id: string, name: string }[];
}

export function BulkEditDialog({ open, onClose, selectedIds, categories }: BulkEditDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Form States ('' means no change)
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [condition, setCondition] = useState('');
    const [size, setSize] = useState('');
    const [priceSell, setPriceSell] = useState('');

    const handleSubmit = async () => {
        const updates: any = {};
        if (category) updates.category = category;
        if (status) updates.status = status;
        if (condition) updates.condition = condition;
        if (size) updates.size = size;
        if (priceSell) updates.price_sell = parseInt(priceSell); // Ensure number

        if (Object.keys(updates).length === 0) {
            toast.error('변경할 항목을 하나 이상 선택해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await bulkUpdateProducts(selectedIds, updates);
            if (res.success) {
                toast.success(`${selectedIds.length}개 상품이 일괄 수정되었습니다.`);
                onClose();
                router.refresh();
                // Reset form
                setCategory('');
                setStatus('');
                setCondition('');
                setSize('');
                setPriceSell('');
            } else {
                toast.error(res.error || '일괄 수정 실패');
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val: boolean) => !val && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>일괄 수정 ({selectedIds.length}개 선택됨)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-slate-500 mb-4">
                        변경하고자 하는 항목만 입력/선택하세요. 입력하지 않은 항목은 기존 값을 유지합니다.
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">카테고리 변경</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="">(변경 없음)</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">상태 변경</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">(변경 없음)</option>
                            <option value="판매중">판매중</option>
                            <option value="판매완료">판매완료</option>
                            <option value="판매대기">판매대기</option>
                            <option value="수정중">수정중</option>
                            <option value="폐기">폐기</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">등급(Condition) 변경</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                        >
                            <option value="">(변경 없음)</option>
                            <option value="S급">S급 (새상품급)</option>
                            <option value="A급">A급 (사용감 적음)</option>
                            <option value="B급">B급 (사용감 있음)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">사이즈 변경</label>
                            <Input
                                placeholder="(변경 없음)"
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">판매가 변경</label>
                            <Input
                                type="number"
                                placeholder="(변경 없음)"
                                value={priceSell}
                                onChange={(e) => setPriceSell(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>취소</Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-slate-900 text-white hover:bg-slate-800">
                        {isLoading ? '처리 중...' : '일괄 수정 적용'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
