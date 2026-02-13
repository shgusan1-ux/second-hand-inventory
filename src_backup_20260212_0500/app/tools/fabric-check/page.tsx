'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getProductsForFabricCheck, updateProductFabric } from '@/lib/fabric-actions';
import { Loader2, Check, X, Search, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Product {
    id: string;
    name: string;
    image_url: string;
    fabric: string | null;
    brand: string | null;
    category: string | null;
    size: string | null;
    price_sell: number | null;
}

export default function FabricCheckTool() {
    const [products, setProducts] = useState<Product[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    // Form State
    const [fabricInput, setFabricInput] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);

    // AI Analysis Result
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    const currentProduct = products[currentIndex];
    const images = currentProduct?.image_url
        ? currentProduct.image_url.split(',').map(url => url.trim()).filter(url => url.length > 0)
        : [];

    // Load Initial Data
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        const data = await getProductsForFabricCheck(50);
        setProducts(data);
        setLoading(false);
    };

    // Auto-Analyze when product changes
    useEffect(() => {
        if (!currentProduct) return;

        setFabricInput('');
        setAiSuggestion(null);
        setCurrentImageIndex(0); // Reset image index

        // Find best image for label (naive logic: try 2nd or 3rd image often contain labels, or look for keywords)
        // Actually, let's just stick to the first image for now, but usually labels are later images.
        // Let's analyze the CURRENTLY displayed image.
        analyzeCurrentImage(images[0]);

    }, [currentProduct?.id]);

    const analyzeCurrentImage = async (url: string) => {
        if (!url) return;

        setAnalyzing(true);
        try {
            const res = await fetch('/api/vision/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });
            const data = await res.json();

            if (data.analysis?.text) {
                // Extract fabric from text
                // We'll leverage the server-side extraction logic if possible, but here we can reuse the client-side logic or just call the bulk API logic.
                // Wait, we have the fabric-extractor lib. We can't use it in client component directly usually? 
                // Ah, we can import it if it's just pure JS function.
                // But better to just let the API return the extracted fabric. 
                // The current /api/vision/analyze returns 'keywords', not fabric specifically.
                // Let's just do a quick client-side extraction or update the API.
                // For now, let's just dump the OCR text and let user see it.

                // Better: Update /api/vision/analyze to return extracted fabric info.
                // Or just do a simple regex here for now.
                const ocrText = data.analysis.text[0].description;
                // Simple Fabric Regex (Client Side)
                const fabRegex = /([가-힣a-zA-Z]+)[\s:.-]*(\d{1,3})\s*%/g;
                const matches = [...ocrText.matchAll(fabRegex)];
                if (matches.length > 0) {
                    const sugg = matches.map(m => `${m[1]} ${m[2]}%`).join(', ');
                    setAiSuggestion(sugg);
                    setFabricInput(sugg); // Auto-fill
                } else {
                    setAiSuggestion('원단 정보 없음 (OCR 텍스트 확인 필요)');
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!currentProduct) return;

        const fab = fabricInput.trim();
        if (!fab) {
            toast.error('원단 정보를 입력해주세요 (혹은 "정보없음")');
            return;
        }

        try {
            await updateProductFabric(currentProduct.id, fab);
            toast.success('저장 완료');
            goToNext();
        } catch (e) {
            toast.error('저장 실패');
        }
    };

    const handleSkip = () => {
        goToNext();
    };

    const goToNext = () => {
        if (currentIndex < products.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            toast.info('모든 상품을 검수했습니다! (새로고침하여 추가 로드)');
            loadProducts(); // Load more?
            setCurrentIndex(0);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                }
                return;
            }

            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                setIsZoomed(prev => !prev);
            }
            if (e.key === 'ArrowRight') {
                setCurrentImageIndex(prev => (prev + 1) % images.length);
            }
            if (e.key === 'ArrowLeft') {
                setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentProduct, fabricInput, images.length]);


    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-blue-500" /></div>;
    }

    if (!currentProduct) {
        return <div className="p-10 text-center">검수할 상품이 없습니다.</div>;
    }

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Left: Image Viewer */}
            <div className="w-1/2 h-full bg-black relative flex items-center justify-center">
                {images.length > 0 ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={images[currentImageIndex]}
                            alt="Product"
                            fill
                            className={`object-contain transition-transform duration-200 ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
                            onClick={() => setIsZoomed(!isZoomed)}
                        />

                        {/* Image Navigation Dots */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
                                />
                            ))}
                        </div>

                        <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
                            {currentImageIndex + 1} / {images.length} (Space: Zoom, Arrows: Prev/Next)
                        </div>
                    </div>
                ) : (
                    <div className="text-white">이미지 없음</div>
                )}
            </div>

            {/* Right: Input Form */}
            <div className="w-1/2 h-full p-8 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Fabric Check Tool</h1>
                    <div className="text-sm text-slate-500">
                        Progress: {currentIndex + 1} / {products.length}
                    </div>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500 block">상품명</span>
                                <span className="font-medium">{currentProduct.name}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block">브랜드</span>
                                <span className="font-medium">{currentProduct.brand}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-2">
                                <Search className="w-3 h-3" />
                                AI Suggestion (Vision API)
                            </div>
                            {analyzing ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                                </div>
                            ) : (
                                <div className="text-lg font-bold text-slate-800">
                                    {aiSuggestion || '원단 정보 감지 안됨'}
                                </div>
                            )}
                            <div className="mt-2 text-xs text-slate-400">
                                * 현재 보고 있는 이미지를 기준으로 분석합니다. 라벨 사진을 선택하세요.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">원단 입력 (Fabric)</label>
                            <div className="flex gap-2">
                                <Input
                                    value={fabricInput}
                                    onChange={(e) => setFabricInput(e.target.value)}
                                    placeholder="예: 면 100%, 폴리에스터 65% 면 35%"
                                    className="text-lg"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-4 mt-auto">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 text-lg"
                        onClick={handleSkip}
                    >
                        Skip (Esc)
                    </Button>
                    <Button
                        className="flex-1 h-12 text-lg bg-blue-600 hover:bg-blue-700"
                        onClick={handleSave}
                    >
                        <Check className="mr-2" /> Save & Next (Enter)
                    </Button>
                </div>

                <div className="mt-4 text-center text-xs text-slate-400">
                    단축키: Enter (저장), Esc (건너뛰기), Space (확대), 화살표 (이미지 이동)
                </div>
            </div>
        </div>
    );
}
