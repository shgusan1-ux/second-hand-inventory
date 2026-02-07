'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Wand2, DollarSign, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAutomationPage() {
    const [productId, setProductId] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [productName, setProductName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [priceConsumer, setPriceConsumer] = useState('');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!imageUrl || !productName) {
            toast.error('이미지 URL과 상품명은 필수입니다');
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: productId,
                    name: productName,
                    brand,
                    category,
                    imageUrl,
                    price_consumer: parseInt(priceConsumer) || 0
                })
            });

            const data = await response.json();
            setResult(data);
            toast.success('AI 분석 완료!');
        } catch (error) {
            toast.error('분석 중 오류가 발생했습니다');
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyToProduct = async () => {
        if (!result || !productId) return;

        try {
            const response = await fetch('/api/products/update-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: productId,
                    condition: result.grade,
                    price_sell: result.suggestedPrice,
                    md_comment: result.mdDescription
                })
            });

            if (response.ok) {
                toast.success('상품에 AI 분석 결과가 적용되었습니다!');
            }
        } catch (error) {
            toast.error('적용 중 오류가 발생했습니다');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                    AI 자동화 도구
                </h1>
                <p className="text-sm text-slate-500">
                    이미지와 상품 정보를 분석하여 등급, 가격, 상품소개를 자동 생성합니다
                </p>
            </div>

            {/* 기능 소개 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-purple-900">
                            <Wand2 className="h-4 w-4" />
                            등급 자동 판정
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-purple-700">
                            AI 비전으로 상품 상태를 분석하여 S/A/B급 자동 판정
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-emerald-900">
                            <DollarSign className="h-4 w-4" />
                            가격 자동 추천
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-emerald-700">
                            유사 상품 데이터 분석으로 최적 판매가 추천
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                            <FileText className="h-4 w-4" />
                            MD 소개 생성
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-blue-700">
                            매력적인 상품 설명을 GPT가 자동 작성
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-orange-900">
                            <ImageIcon className="h-4 w-4" />
                            썸네일 최적화
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-orange-700">
                            이미지 자동 크롭 및 리사이징
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 입력 폼 */}
            <Card>
                <CardHeader>
                    <CardTitle>상품 정보 입력</CardTitle>
                    <CardDescription>
                        분석할 상품의 정보를 입력하세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">상품코드 (선택)</label>
                            <Input
                                placeholder="예: ABC123"
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-red-600">이미지 URL *</label>
                            <Input
                                placeholder="https://..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-red-600">상품명 *</label>
                        <Input
                            placeholder="예: RALPH LAUREN 폴로 옥스포드 셔츠"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">브랜드</label>
                            <Input
                                placeholder="예: RALPH LAUREN"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">카테고리</label>
                            <Input
                                placeholder="예: 상의"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">소비자가</label>
                            <Input
                                type="number"
                                placeholder="예: 150000"
                                value={priceConsumer}
                                onChange={(e) => setPriceConsumer(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !imageUrl || !productName}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                AI 분석 중... (30초 소요)
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                AI 자동 분석 시작
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* 결과 표시 */}
            {result && (
                <div className="space-y-4">
                    <Card className="border-emerald-200 bg-emerald-50/30">
                        <CardHeader>
                            <CardTitle className="text-emerald-900 flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                AI 분석 결과
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* 등급 */}
                            <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        <Wand2 className="h-4 w-4 text-purple-600" />
                                        등급 판정
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${result.grade === 'S급' ? 'bg-purple-100 text-purple-700' :
                                            result.grade === 'A급' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {result.grade}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">{result.gradeReason}</p>
                                <p className="text-xs text-slate-400 mt-1">신뢰도: {result.confidence}%</p>
                            </div>

                            {/* 가격 */}
                            <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-600" />
                                        추천 판매가
                                    </h3>
                                    <span className="text-2xl font-bold text-emerald-600">
                                        ₩{result.suggestedPrice.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">{result.priceReason}</p>
                            </div>

                            {/* MD 소개 */}
                            <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    MD 상품소개
                                </h3>
                                <div
                                    className="prose prose-sm max-w-none text-slate-700"
                                    dangerouslySetInnerHTML={{ __html: result.mdDescription }}
                                />
                            </div>

                            {/* 적용 버튼 */}
                            {productId && (
                                <Button
                                    onClick={handleApplyToProduct}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                >
                                    상품에 적용하기
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 이미지 미리보기 */}
            {imageUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">이미지 미리보기</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <img
                            src={imageUrl}
                            alt="Product"
                            className="w-full max-w-md mx-auto rounded-lg border"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.jpg';
                            }}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
