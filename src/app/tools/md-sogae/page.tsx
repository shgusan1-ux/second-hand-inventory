'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Sparkles,
    DollarSign,
    FileText,
    Tag,
    Loader2,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Award,
    Scissors
} from 'lucide-react';
import { toast } from 'sonner';

export default function MDSogaePage() {
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [showMetadataCard, setShowMetadataCard] = useState(false);
    const [approved, setApproved] = useState(false);

    const handleAnalyze = async () => {
        if (!imageUrl || !category) {
            toast.error('이미지 URL과 카테고리는 필수입니다');
            return;
        }

        setIsAnalyzing(true);
        setShowMetadataCard(false);
        setApproved(false);

        try {
            const response = await fetch('/api/md-sogae/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl, category })
            });

            const data = await response.json();
            setResult(data);
            setShowMetadataCard(true);
            toast.success('MD-SOGAE 분석 완료!');
        } catch (error) {
            toast.error('분석 중 오류가 발생했습니다');
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApprove = () => {
        setApproved(true);
        setShowMetadataCard(false);
        toast.success('메타데이터 승인 완료! 상세 정보를 확인하세요.');
    };

    const handleEdit = () => {
        toast.info('메타데이터 수정 모드로 전환합니다.');
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Shield className="h-8 w-8 text-indigo-600" />
                    MD-SOGAE v2.9
                </h1>
                <p className="text-sm text-slate-500">
                    대한민국 최고의 패션 아카이브 전문가 및 자산 평가사 시스템
                </p>
            </div>

            {/* 4-Phase Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-purple-900">
                            <Scissors className="h-4 w-4" />
                            Phase 1: Visual & OCR
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-purple-700">
                            케어라벨 스캔, 품번·소재 추출
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-emerald-900">
                            <TrendingUp className="h-4 w-4" />
                            Phase 2: Market Intelligence
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-emerald-700">
                            글로벌+국내 실거래가 분석
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                            <Tag className="h-4 w-4" />
                            Phase 3: Professional Naming
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-blue-700">
                            SEO 최적화 전문 작명 (50자 이내)
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-orange-900">
                            <FileText className="h-4 w-4" />
                            Phase 4: Editorial
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-orange-700">
                            전문가적 상세페이지 생성
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Input Form */}
            <Card>
                <CardHeader>
                    <CardTitle>상품 이미지 분석</CardTitle>
                    <CardDescription>
                        케어라벨이 포함된 상품 이미지를 분석합니다
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-red-600">이미지 URL *</label>
                        <Input
                            placeholder="https://..."
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-red-600">카테고리 *</label>
                        <Input
                            placeholder="예: 아우터, 상의, 하의"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                        />
                    </div>

                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !imageUrl || !category}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                MD-SOGAE 분석 중... (60초 소요)
                            </>
                        ) : (
                            <>
                                <Shield className="h-5 w-5 mr-2" />
                                MD-SOGAE v2.9 분석 시작
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Metadata Card (중간 검수창) */}
            {showMetadataCard && result && (
                <Card className="border-amber-300 bg-amber-50/50 shadow-lg">
                    <CardHeader className="bg-amber-100/50">
                        <CardTitle className="text-amber-900 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            메타데이터 검수 (관리자 승인 필요)
                        </CardTitle>
                        <CardDescription>
                            AI가 추출한 데이터를 확인하고 승인하세요
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600">추출 품번</label>
                                <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="font-mono text-sm font-bold text-slate-900">
                                        {result.metadataCard.extractedCode || '품번 없음'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600">판별 소재</label>
                                <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="text-sm text-slate-900">
                                        {result.metadataCard.detectedFabric || '소재 정보 없음'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600">산출 가격</label>
                                <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="text-lg font-bold text-emerald-600">
                                        ₩{result.metadataCard.calculatedPrice.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600">추천 제목</label>
                                <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="text-sm font-medium text-slate-900">
                                        {result.metadataCard.suggestedName}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={handleApprove}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                승인 및 상세 정보 보기
                            </Button>
                            <Button
                                onClick={handleEdit}
                                variant="outline"
                                className="flex-1 border-amber-300 hover:bg-amber-50"
                            >
                                수정
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detailed Results (승인 후 표시) */}
            {approved && result && (
                <div className="space-y-4">
                    {/* Phase 1: Care Label Data */}
                    <Card className="border-purple-200 bg-purple-50/20">
                        <CardHeader>
                            <CardTitle className="text-purple-900 flex items-center gap-2">
                                <Scissors className="h-5 w-5" />
                                Phase 1: 케어라벨 데이터
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <p className="text-xs text-slate-500">품번</p>
                                    <p className="font-mono font-bold">{result.careLabel.productCode}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">브랜드</p>
                                    <p className="font-semibold">{result.careLabel.brand}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">서브라인</p>
                                    <p className="text-sm">{result.careLabel.subLine || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">소재</p>
                                    <p className="text-sm">{result.careLabel.fabricComposition}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">사이즈</p>
                                    <p className="font-semibold">{result.careLabel.size}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">원산지</p>
                                    <p className="text-sm">{result.careLabel.madeIn}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">등급</p>
                                <Badge className={`${result.careLabel.grade === 'S' ? 'bg-purple-600' :
                                        result.careLabel.grade === 'A' ? 'bg-blue-600' :
                                            'bg-slate-600'
                                    }`}>
                                    {result.careLabel.grade}급
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Phase 2: Market Price */}
                    <Card className="border-emerald-200 bg-emerald-50/20">
                        <CardHeader>
                            <CardTitle className="text-emerald-900 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Phase 2: 시장 가격 분석
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">글로벌 평균</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₩{result.marketPrice.globalAverage.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">KREAM</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₩{result.marketPrice.kreamPrice.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">무신사 USED</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₩{result.marketPrice.usedPrice.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">번개장터</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₩{result.marketPrice.bunjangPrice.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border">
                                    <p className="text-xs text-slate-500">후르츠패밀리</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₩{result.marketPrice.fruitsPrice.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-100 rounded-lg border-2 border-emerald-400">
                                    <p className="text-xs text-emerald-700 font-semibold">최종 추천가</p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        ₩{result.marketPrice.finalPrice.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-lg border">
                                <p className="text-xs text-slate-500 mb-1">가격 산출 근거</p>
                                <p className="text-sm text-slate-700">{result.marketPrice.priceReason}</p>
                                <div className="flex gap-2 mt-2">
                                    {result.marketPrice.dataSource.map((source: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                            {source}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Phase 3: Professional Name */}
                    <Card className="border-blue-200 bg-blue-50/20">
                        <CardHeader>
                            <CardTitle className="text-blue-900 flex items-center gap-2">
                                <Tag className="h-5 w-5" />
                                Phase 3: 전문 작명
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
                                <p className="text-xs text-slate-500 mb-2">완성된 상품명 (SEO 최적화)</p>
                                <p className="text-lg font-bold text-slate-900">
                                    {result.professionalName.fullName}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {result.professionalName.fullName.length}자 / 45자
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <p className="text-xs text-slate-500">전문 태그</p>
                                    <Badge className="bg-blue-600">{result.professionalName.tag}</Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">연식+모델</p>
                                    <p className="text-sm font-medium">{result.professionalName.yearModel}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">특징/핏</p>
                                    <p className="text-sm">{result.professionalName.feature}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">성별-사이즈</p>
                                    <p className="text-sm font-semibold">{result.professionalName.genderSize}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Phase 4: Editorial Content */}
                    <Card className="border-orange-200 bg-orange-50/20">
                        <CardHeader>
                            <CardTitle className="text-orange-900 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Phase 4: 에디토리얼 콘텐츠
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-white rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award className="h-4 w-4 text-orange-600" />
                                    <h4 className="font-semibold text-slate-900">Brand Heritage</h4>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {result.editorial.brandHeritage}
                                </p>
                            </div>

                            <div className="p-4 bg-white rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4 text-orange-600" />
                                    <h4 className="font-semibold text-slate-900">Detail Guide</h4>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {result.editorial.detailGuide}
                                </p>
                            </div>

                            <div className="p-4 bg-white rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-orange-600" />
                                    <h4 className="font-semibold text-slate-900">Archive Value</h4>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {result.editorial.archiveValue}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Apply Button */}
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg font-bold">
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        상품에 적용하기
                    </Button>
                </div>
            )}

            {/* Image Preview */}
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
