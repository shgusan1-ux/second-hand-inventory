'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateProduct } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    sort_order: number;
}

interface ProductEditDialogProps {
    open: boolean;
    onClose: () => void;
    product: any;
    categories: Category[];
}

export function ProductEditDialog({ open, onClose, product, categories }: ProductEditDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Local state for category selection helper
    const [categoryNum, setCategoryNum] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // AI analysis results
    const [aiGrade, setAiGrade] = useState<string>('');
    const [aiPrice, setAiPrice] = useState<number>(0);
    const [aiDescription, setAiDescription] = useState<string>('');

    useEffect(() => {
        if (product) {
            setSelectedCategory(product.category || '');
            const cat = categories.find(c => c.name === product.category);
            if (cat) setCategoryNum(cat.sort_order.toString());
            else setCategoryNum('');
        }
    }, [product, categories]);

    const handleCategoryNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value;
        setCategoryNum(num);
        const cat = categories.find(c => c.sort_order.toString() === num);
        if (cat) {
            setSelectedCategory(cat.name);
        } else {
            setSelectedCategory('');
        }
    };

    const handleAIAnalysis = async () => {
        if (!product.image_url && !product.images) {
            toast.error('이미지가 없어서 AI 분석을 할 수 없습니다');
            return;
        }

        setIsAnalyzing(true);
        try {
            // Get first image URL
            let imageUrl = product.image_url;
            if (!imageUrl && product.images) {
                try {
                    const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                    if (Array.isArray(parsed) && parsed[0]) {
                        imageUrl = parsed[0];
                    }
                } catch (e) { }
            }

            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    imageUrl,
                    price_consumer: product.price_consumer || 0
                })
            });

            const data = await response.json();

            if (data.error) {
                toast.error(data.error);
                return;
            }

            // Update form fields
            setAiGrade(data.grade);
            setAiPrice(data.suggestedPrice);
            setAiDescription(data.mdDescription);

            // Update form inputs directly
            const form = document.querySelector('form');
            if (form) {
                const conditionSelect = form.querySelector('select[name="condition"]') as HTMLSelectElement;
                const priceInput = form.querySelector('input[name="price_sell"]') as HTMLInputElement;
                const mdTextarea = form.querySelector('textarea[name="md_comment"]') as HTMLTextAreaElement;

                if (conditionSelect) conditionSelect.value = data.grade;
                if (priceInput) priceInput.value = data.suggestedPrice.toString();
                if (mdTextarea) mdTextarea.value = data.mdDescription;
            }

            toast.success('AI 분석 완료! 등급, 가격, MD 소개가 자동으로 입력되었습니다.');
        } catch (error) {
            console.error('AI analysis error:', error);
            toast.error('AI 분석 중 오류가 발생했습니다');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!product) return null;

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        // We use the action from lib/actions
        try {
            await updateProduct(product.id, formData);
            toast.success('상품 정보가 수정되었습니다.');
            onClose();
            router.refresh();
        } catch (e) {
            toast.error('수정 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val: boolean) => !val && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>상품 정보 수정: {product.name}</DialogTitle>
                        <Button
                            type="button"
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    AI 분석 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    AI 자동 분석
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4 py-4">
                    {/* ID (Read Only) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500">자체상품코드 (ID)</label>
                            <Input name="id" defaultValue={product.id} readOnly className="bg-slate-100 font-mono" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">카테고리</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="번호"
                                    className="w-20"
                                    value={categoryNum}
                                    onChange={handleCategoryNumChange}
                                />
                                <select
                                    name="category"
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        const cat = categories.find(c => c.name === e.target.value);
                                        if (cat) setCategoryNum(cat.sort_order.toString());
                                    }}
                                >
                                    <option value="">선택하세요</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name} ({cat.sort_order})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">상품명</label>
                        <Input name="name" defaultValue={product.name} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">브랜드</label>
                            <Input name="brand" defaultValue={product.brand} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">등급 (GRADE)</label>
                            <select name="condition" defaultValue={product.condition || 'A급'} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                                <option value="S급">S급 (새상품급)</option>
                                <option value="A급">A급 (사용감 적음)</option>
                                <option value="B급">B급 (사용감 있음)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">사이즈</label>
                            <Input name="size" defaultValue={product.size} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">상태 (판매)</label>
                            <select name="status" defaultValue={product.status || '판매중'} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                                <option value="판매중">판매중</option>
                                <option value="판매완료">판매완료</option>
                                <option value="판매대기">판매대기</option>
                                <option value="수정중">수정중</option>
                                <option value="폐기">폐기</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">소비자가격 (정상가)</label>
                            <Input name="price_consumer" type="number" defaultValue={product.price_consumer} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-emerald-600 font-bold">판매가격</label>
                            <Input name="price_sell" type="number" defaultValue={product.price_sell} className="border-emerald-500 ring-emerald-100" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">이미지 URL (최대 5개)</label>
                        <div className="space-y-2">
                            {[0, 1, 2, 3, 4].map((i) => {
                                // Parse existing images if any
                                let val = '';
                                try {
                                    const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                                    if (Array.isArray(parsed) && parsed[i]) val = parsed[i];
                                    else if (i === 0 && product.image_url) val = product.image_url;
                                } catch (e) { }

                                return (
                                    <Input key={i} name={`image_${i}`} defaultValue={val} placeholder={`이미지 URL ${i + 1}`} />
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">상품상세내용 (MD 코멘트)</label>
                        <Tabs defaultValue="editor" className="w-full">
                            <TabsList className="mb-2">
                                <TabsTrigger value="editor">에디터 (수정)</TabsTrigger>
                                <TabsTrigger value="preview">미리보기 (HTML)</TabsTrigger>
                            </TabsList>
                            <TabsContent value="editor">
                                <textarea
                                    name="md_comment"
                                    defaultValue={product.md_comment}
                                    className="flex min-h-[150px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 font-mono"
                                />
                            </TabsContent>
                            <TabsContent value="preview">
                                <div
                                    className="min-h-[150px] w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm overflow-auto prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: product.md_comment }}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>취소</Button>
                        <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
                            {isLoading ? '저장 중...' : '저장하기'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
