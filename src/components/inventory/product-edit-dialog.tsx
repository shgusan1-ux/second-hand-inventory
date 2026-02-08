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
import { Sparkles, Loader2, Eye, Code, Copy } from 'lucide-react';
import Image from 'next/image';
import { generateProductDetailHTML } from '@/lib/product-detail-generator';

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
    const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');

    // Local state for category selection helper
    const [categoryNum, setCategoryNum] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // AI analysis results
    const [aiGrade, setAiGrade] = useState<string>('');
    const [aiPrice, setAiPrice] = useState<number>(0);
    const [aiDescription, setAiDescription] = useState<string>('');

    // Live preview state
    const [previewProduct, setPreviewProduct] = useState<any>(null);
    const [htmlCode, setHtmlCode] = useState('');

    useEffect(() => {
        if (product) {
            setSelectedCategory(product.category || '');
            const cat = categories.find(c => c.name === product.category);
            if (cat) setCategoryNum(cat.sort_order.toString());
            else setCategoryNum('');
            setPreviewProduct(product);
            setHtmlCode(generateProductDetailHTML(product));
        }
    }, [product, categories]);

    // Update preview when form changes
    const updatePreview = () => {
        if (!previewProduct) return;

        const form = document.querySelector('form');
        if (form) {
            const formData = new FormData(form);

            // Collect all image URLs
            const imageUrls = [];
            for (let i = 0; i < 5; i++) {
                const imgUrl = formData.get(`image_${i}`);
                if (imgUrl && imgUrl.toString().trim()) {
                    imageUrls.push(imgUrl.toString().trim());
                }
            }

            // Fallback: If form reading failed or yielded no images, keep existing images
            // This prevents images from disappearing during AI updates which trigger this function
            const finalImages = imageUrls.length > 0 ? imageUrls.join(', ') : previewProduct.image_url;

            const updatedProduct = {
                ...previewProduct,
                name: formData.get('name') || previewProduct.name,
                brand: formData.get('brand') || previewProduct.brand,
                condition: formData.get('condition') || previewProduct.condition,
                size: formData.get('size') || previewProduct.size,
                price_sell: formData.get('price_sell') || previewProduct.price_sell,
                category: formData.get('category') || previewProduct.category,
                md_comment: formData.get('md_comment') || previewProduct.md_comment,
                image_url: finalImages,
            };
            setPreviewProduct(updatedProduct);
            setHtmlCode(generateProductDetailHTML(updatedProduct));
        }
    };

    const handleCategoryNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value;
        setCategoryNum(num);
        const cat = categories.find(c => c.sort_order.toString() === num);
        if (cat) {
            setSelectedCategory(cat.name);
        } else {
            setSelectedCategory('');
        }
        setTimeout(updatePreview, 100);
    };

    const handleAIAnalysis = async () => {
        if (!product.image_url && !product.images) {
            toast.error('이미지가 없어서 AI 분석을 할 수 없습니다');
            return;
        }

        setIsAnalyzing(true);
        try {
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

            setAiGrade(data.grade);
            setAiPrice(data.suggestedPrice);
            setAiDescription(data.mdDescription);

            const form = document.querySelector('form');
            if (form) {
                const conditionSelect = form.querySelector('select[name="condition"]') as HTMLSelectElement;
                const priceInput = form.querySelector('input[name="price_sell"]') as HTMLInputElement;
                const mdTextarea = form.querySelector('textarea[name="md_comment"]') as HTMLTextAreaElement;
                const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement;
                const brandInput = form.querySelector('input[name="brand"]') as HTMLInputElement;
                const sizeInput = form.querySelector('input[name="size"]') as HTMLInputElement;
                const fabricInput = form.querySelector('input[name="fabric"]') as HTMLInputElement;

                if (conditionSelect) conditionSelect.value = data.grade;
                if (priceInput) priceInput.value = data.suggestedPrice.toString();
                if (mdTextarea) mdTextarea.value = data.mdDescription;
                if (nameInput && data.suggestedName) nameInput.value = data.suggestedName;
                if (brandInput && data.suggestedBrand) brandInput.value = data.suggestedBrand;
                if (sizeInput && data.suggestedSize) sizeInput.value = data.suggestedSize;
                if (fabricInput && data.suggestedFabric) fabricInput.value = data.suggestedFabric;
            }

            toast.success('AI 분석 완료! 상품 정보가 자동으로 입력되었습니다.');

            // Update preview state directly to avoid image loss issue
            const updatedProduct = {
                ...previewProduct,
                name: data.suggestedName || previewProduct.name,
                brand: data.suggestedBrand || previewProduct.brand,
                size: data.suggestedSize || previewProduct.size,
                fabric: data.suggestedFabric || previewProduct.fabric,
                condition: data.grade,
                price_sell: data.suggestedPrice,
                md_comment: data.mdDescription
            };
            setPreviewProduct(updatedProduct);
            setHtmlCode(generateProductDetailHTML(updatedProduct));

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

    const handleCopyHTML = () => {
        navigator.clipboard.writeText(htmlCode);
        toast.success('상세페이지 HTML이 클립보드에 복사되었습니다!');
    };

    const imageUrls = previewProduct?.image_url ? previewProduct.image_url.split(',').map((url: string) => url.trim()) : [];

    return (
        <Dialog open={open} onOpenChange={(val: boolean) => !val && onClose()}>
            <DialogContent className="max-w-[95vw] w-[1600px] h-[90vh] p-0 overflow-hidden">
                <div className="flex h-full overflow-hidden">
                    {/* Left Panel - Edit Form */}
                    <div className="w-[700px] border-r bg-white flex flex-col">
                        <DialogHeader className="p-6 border-b">
                            <div className="flex items-center justify-between">
                                <DialogTitle>상품 정보 수정: {product.name}</DialogTitle>
                                <Button
                                    type="button"
                                    onClick={handleAIAnalysis}
                                    disabled={isAnalyzing}
                                    size="sm"
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

                        <div className="flex-1 overflow-y-auto p-6">
                            <form action={handleSubmit} className="space-y-4" onChange={updatePreview}>
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
                                                    setTimeout(updatePreview, 100);
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
                                        <label className="text-sm font-medium">원단 (FABRIC)</label>
                                        <Input name="fabric" defaultValue={product.fabric} placeholder="예: 면 100%" />
                                    </div>
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

                                {/* Market Price Intelligence Links */}
                                <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                                    <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                                        <span>🔍 4대 플랫폼 시세 분석 (Market Price Intelligence)</span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                        <a
                                            href={`https://kream.co.kr/search?keyword=${encodeURIComponent(product.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs py-2 px-2 rounded border border-slate-200 transition-colors shadow-sm"
                                            title="Step 1: 상한선 확인 (Deadstock)"
                                        >
                                            <span className="font-extrabold text-black">KREAM</span>
                                        </a>
                                        <a
                                            href={`https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(product.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs py-2 px-2 rounded border border-slate-200 transition-colors shadow-sm"
                                            title="Step 2: 상업 표준가 확인"
                                        >
                                            <span className="font-bold text-black">MUSINSA</span>
                                        </a>
                                        <a
                                            href={`https://m.bunjang.co.kr/search/products?q=${encodeURIComponent(product.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs py-2 px-2 rounded border border-slate-200 transition-colors shadow-sm"
                                            title="Step 3: 유동 시세 확인"
                                        >
                                            <span className="font-bold text-red-500">⚡ 번개장터</span>
                                        </a>
                                        <a
                                            href={`https://fruitsfamily.com/search?keyword=${encodeURIComponent(product.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs py-2 px-2 rounded border border-slate-200 transition-colors shadow-sm"
                                            title="Step 4: 프리미엄 가치 확인"
                                        >
                                            <span className="font-bold text-purple-600">🍇 후르츠</span>
                                        </a>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-400 text-center">
                                        * Tip: 각 플랫폼의 시세를 종합하여 최적의 판매가를 설정하세요.
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
                                    <textarea
                                        name="md_comment"
                                        defaultValue={product.md_comment}
                                        className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 font-mono"
                                    />
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>취소</Button>
                                    <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
                                        {isLoading ? '저장 중...' : '저장하기'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </div>
                    </div>

                    {/* Right Panel - Live Preview */}
                    <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
                        <div className="p-4 border-b bg-white flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">상세페이지 미리보기</h3>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={previewMode === 'preview' ? 'default' : 'outline'}
                                    onClick={() => setPreviewMode('preview')}
                                    className="gap-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    미리보기
                                </Button>
                                <Button
                                    size="sm"
                                    variant={previewMode === 'code' ? 'default' : 'outline'}
                                    onClick={() => setPreviewMode('code')}
                                    className="gap-2"
                                >
                                    <Code className="w-4 h-4" />
                                    HTML 코드
                                </Button>
                                <Button onClick={handleCopyHTML} size="sm" variant="outline" className="gap-2">
                                    <Copy className="w-4 h-4" />
                                    복사
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {previewMode === 'preview' ? (
                                <div className="p-6 bg-white min-h-full">
                                    <div dangerouslySetInnerHTML={{ __html: htmlCode }} />
                                </div>
                            ) : (
                                <pre className="bg-slate-900 text-slate-100 p-6 text-xs min-h-full">
                                    <code>{htmlCode}</code>
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent >
        </Dialog >
    );
}
