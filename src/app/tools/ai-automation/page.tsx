'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Wand2,
    DollarSign,
    FileText,
    Image as ImageIcon,
    Loader2,
    Search,
    Package,
    Shield,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Award,
    Tag
} from 'lucide-react';
import { toast } from 'sonner';

export default function AIAutomationPage() {
    // 탭 상태
    const [activeTab, setActiveTab] = useState<'basic' | 'mdsogae'>('basic');

    // 공통 상태
    const [productId, setProductId] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [productName, setProductName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [priceConsumer, setPriceConsumer] = useState('');

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 기본 AI 분석 결과
    const [basicResult, setBasicResult] = useState<any>(null);

    // MD-SOGAE 결과
    const [mdSogaeResult, setMdSogaeResult] = useState<any>(null);
    const [showMetadataCard, setShowMetadataCard] = useState(false);
    const [approved, setApproved] = useState(false);

    // 상품 검색
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // 기본 AI 분석
    const handleBasicAnalyze = async () => {
        const imagesToAnalyze = selectedImages.length > 0 ? selectedImages : (imageUrl ? [imageUrl] : []);

        if (imagesToAnalyze.length === 0 || !productName) {
            toast.error('이미지와 상품명은 필수입니다');
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
                    imageUrl: imagesToAnalyze[0], // 첫 번째 이미지를 메인으로
                    imageUrls: imagesToAnalyze, // 모든 선택된 이미지
                    price_consumer: parseInt(priceConsumer) || 0
                })
            });

            const data = await response.json();
            setBasicResult(data);
            toast.success(`AI 분석 완료! (${imagesToAnalyze.length}개 이미지 분석)`);
        } catch (error) {
            toast.error('분석 중 오류가 발생했습니다');
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // MD-SOGAE 분석
    const handleMDSogaeAnalyze = async () => {
        const imagesToAnalyze = selectedImages.length > 0 ? selectedImages : (imageUrl ? [imageUrl] : []);

        if (imagesToAnalyze.length === 0 || !category) {
            toast.error('이미지와 카테고리는 필수입니다');
            return;
        }

        setIsAnalyzing(true);
        setShowMetadataCard(false);
        setApproved(false);

        try {
            const response = await fetch('/api/md-sogae/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: imagesToAnalyze[0], // 첫 번째 이미지를 메인으로
                    imageUrls: imagesToAnalyze, // 모든 선택된 이미지
                    category
                })
            });

            const data = await response.json();
            setMdSogaeResult(data);
            setShowMetadataCard(true);
            toast.success(`MD-SOGAE 분석 완료! (${imagesToAnalyze.length}개 이미지 분석)`);
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

    const handleApplyToProduct = async () => {
        const result = activeTab === 'basic' ? basicResult : mdSogaeResult;
        if (!result || !productId) {
            toast.error('상품 ID가 필요합니다');
            return;
        }

        try {
            const response = await fetch('/api/products/update-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: productId,
                    condition: result.grade || result.careLabel?.grade,
                    price_sell: result.suggestedPrice || result.marketPrice?.finalPrice,
                    md_comment: result.mdDescription || result.editorial?.detailGuide
                })
            });

            if (response.ok) {
                toast.success('상품에 AI 분석 결과가 적용되었습니다!');
            }
        } catch (error) {
            toast.error('적용 중 오류가 발생했습니다');
        }
    };

    // 상품 검색
    const handleSearchProducts = async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setSearchResults(data.products || []);
            setShowSearchResults(true);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // 상품 이미지 관리
    const [allImages, setAllImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    // 상품 불러오기
    const handleLoadProduct = (product: any) => {
        setProductId(product.id);
        setProductName(product.name);
        setBrand(product.brand || '');
        setCategory(product.category || '');
        setPriceConsumer(product.price_consumer?.toString() || '');

        // 여러 이미지 처리
        const imageUrls = product.image_url
            ? product.image_url.split(',').map((url: string) => url.trim()).filter((url: string) => url)
            : [];

        setAllImages(imageUrls);
        setSelectedImages(imageUrls); // 기본적으로 모든 이미지 선택
        setImageUrl(imageUrls[0] || ''); // 첫 번째 이미지를 기본값으로

        setSearchQuery(product.name);
        setShowSearchResults(false);

        if (imageUrls.length > 1) {
            toast.success(`상품 "${product.name}" 불러오기 완료! (이미지 ${imageUrls.length}개)`);
        } else {
            toast.success(`상품 "${product.name}" 불러오기 완료!`);
        }
    };

    // 이미지 선택 토글
    const toggleImageSelection = (imageUrl: string) => {
        setSelectedImages(prev => {
            if (prev.includes(imageUrl)) {
                return prev.filter(url => url !== imageUrl);
            } else {
                return [...prev, imageUrl];
            }
        });
    };

    // 검색어 변경 시 자동 검색
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearchProducts(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="space-y-6 p-6">
            {/* 헤더 */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                    AI 자동화 도구
                </h1>
                <p className="text-sm text-slate-500">
                    이미지와 상품 정보를 분석하여 등급, 가격, 상품소개를 자동 생성합니다
                </p>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('basic')}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'basic'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        기본 AI 분석
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('mdsogae')}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'mdsogae'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        MD-SOGAE v2.9
                    </div>
                </button>
            </div>

            {/* 상품 검색 및 불러오기 */}
            <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                        <Package className="h-5 w-5" />
                        등록된 상품 불러오기
                    </CardTitle>
                    <CardDescription>
                        이미 등록된 상품을 검색하여 불러온 후 AI 분석을 실행하세요
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="상품명, 브랜드, 코드로 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                                className="pl-10"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-600" />
                            )}
                        </div>

                        {/* 검색 결과 드롭다운 */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        className="px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            {product.image_url && (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-16 h-16 object-cover rounded border"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-slate-900 truncate">
                                                    {product.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {product.brand && (
                                                        <span className="text-xs text-slate-500">
                                                            {product.brand}
                                                        </span>
                                                    )}
                                                    {product.category && (
                                                        <span className="text-xs text-slate-400">
                                                            • {product.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    ID: {product.id}
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => handleLoadProduct(product)}
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                                            >
                                                <Package className="h-3 w-3 mr-1" />
                                                불러오기
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500">
                                검색 결과가 없습니다
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 이미지 선택 UI (여러 이미지가 있을 때만 표시) */}
            {allImages.length > 1 && (
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-900">
                            <ImageIcon className="h-5 w-5" />
                            상품 이미지 선택 ({selectedImages.length}/{allImages.length}개 선택됨)
                        </CardTitle>
                        <CardDescription>
                            AI 분석에 사용할 이미지를 선택하세요. 여러 이미지를 선택하면 더 정확한 분석이 가능합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {allImages.map((imgUrl, index) => (
                                <div
                                    key={index}
                                    onClick={() => toggleImageSelection(imgUrl)}
                                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${selectedImages.includes(imgUrl)
                                        ? 'border-amber-500 ring-2 ring-amber-200'
                                        : 'border-slate-200 hover:border-amber-300'
                                        }`}
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Product ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder.jpg';
                                        }}
                                    />
                                    {selectedImages.includes(imgUrl) && (
                                        <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center rounded-b-lg">
                                        이미지 {index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-4">
                            <Button
                                onClick={() => setSelectedImages(allImages)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                전체 선택
                            </Button>
                            <Button
                                onClick={() => setSelectedImages([])}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                선택 해제
                            </Button>
                        </div>

                        {selectedImages.length === 0 && (
                            <p className="text-sm text-amber-600 mt-3 text-center">
                                ⚠️ 최소 1개 이상의 이미지를 선택해주세요
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 기본 AI 분석 탭 */}
            {activeTab === 'basic' && (
                <BasicAITab
                    productId={productId}
                    setProductId={setProductId}
                    imageUrl={imageUrl}
                    setImageUrl={setImageUrl}
                    productName={productName}
                    setProductName={setProductName}
                    brand={brand}
                    setBrand={setBrand}
                    category={category}
                    setCategory={setCategory}
                    priceConsumer={priceConsumer}
                    setPriceConsumer={setPriceConsumer}
                    isAnalyzing={isAnalyzing}
                    result={basicResult}
                    onAnalyze={handleBasicAnalyze}
                    onApply={handleApplyToProduct}
                />
            )}

            {/* MD-SOGAE v2.9 탭 */}
            {activeTab === 'mdsogae' && (
                <MDSogaeTab
                    imageUrl={imageUrl}
                    setImageUrl={setImageUrl}
                    category={category}
                    setCategory={setCategory}
                    isAnalyzing={isAnalyzing}
                    result={mdSogaeResult}
                    showMetadataCard={showMetadataCard}
                    approved={approved}
                    onAnalyze={handleMDSogaeAnalyze}
                    onApprove={handleApprove}
                    onApply={handleApplyToProduct}
                />
            )}
        </div>
    );
}

// 기본 AI 분석 탭 컴포넌트
function BasicAITab({ productId, setProductId, imageUrl, setImageUrl, productName, setProductName, brand, setBrand, category, setCategory, priceConsumer, setPriceConsumer, isAnalyzing, result, onAnalyze, onApply }: any) {
    return (
        <div className="space-y-6">
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
                        분석할 상품의 정보를 입력하세요 (또는 위에서 상품을 검색하여 불러오세요)
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
                        onClick={onAnalyze}
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
                                onClick={onApply}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                상품에 적용하기
                            </Button>
                        )}
                    </CardContent>
                </Card>
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

// MD-SOGAE v2.9 탭 컴포넌트
function MDSogaeTab({ imageUrl, setImageUrl, category, setCategory, isAnalyzing, result, showMetadataCard, approved, onAnalyze, onApprove, onApply }: any) {
    return (
        <div className="space-y-6">
            {/* 4-Phase Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-purple-900">
                            <Search className="h-4 w-4" />
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

            {/* 입력 폼 */}
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
                        onClick={onAnalyze}
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
                                onClick={onApprove}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                승인 및 상세 정보 보기
                            </Button>
                            <Button
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
                                <Search className="h-5 w-5" />
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
                                    <p className="text-xs text-slate-500">소재</p>
                                    <p className="text-sm">{result.careLabel.fabricComposition}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">사이즈</p>
                                    <p className="font-semibold">{result.careLabel.size}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">등급</p>
                                    <Badge className={`${result.careLabel.grade === 'S' ? 'bg-purple-600' :
                                        result.careLabel.grade === 'A' ? 'bg-blue-600' :
                                            'bg-slate-600'
                                        }`}>
                                        {result.careLabel.grade}급
                                    </Badge>
                                </div>
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
                    <Button onClick={onApply} className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg font-bold">
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
