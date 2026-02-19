'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast, Toaster } from 'sonner';

interface SupplierStats {
    total: number;
    genders: Record<string, number>;
    categories: Record<string, number>;
    brands_count: number;
    with_measurements: number;
    last_uploaded?: string;
}

interface UploadResult {
    success: boolean;
    total: number;
    inserted: number;
    updated: number;
    errors: number;
}

export default function SupplierDataPage() {
    const [stats, setStats] = useState<SupplierStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'barcode' | 'code' | 'name'>('name');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/supplier/stats');
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('Stats fetch error:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
            toast.error('엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            setUploadProgress(30);

            const res = await fetch('/api/admin/supplier/upload', {
                method: 'POST',
                body: formData,
            });

            setUploadProgress(90);

            const data = await res.json();

            if (data.success) {
                setUploadResult(data);
                toast.success(`업로드 완료: ${data.inserted}개 신규, ${data.updated}개 업데이트`);
                fetchStats();
            } else {
                toast.error(`업로드 실패: ${data.error}`);
            }
        } catch (err: any) {
            toast.error(`업로드 오류: ${err.message}`);
        } finally {
            setIsUploading(false);
            setUploadProgress(100);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSelectedProduct(null);
        try {
            const params = new URLSearchParams();
            if (searchType === 'barcode') params.set('barcode', searchQuery);
            else if (searchType === 'code') params.set('code', searchQuery);
            else params.set('name', searchQuery);

            const res = await fetch(`/api/admin/supplier/lookup?${params}`);
            const data = await res.json();
            setSearchResults(data.data || []);
            if (data.data?.length === 0) toast.info('검색 결과가 없습니다.');
        } catch (e: any) {
            toast.error('검색 실패: ' + e.message);
        } finally {
            setIsSearching(false);
        }
    };

    const formatMeasurement = (val: any, label: string) => {
        if (!val) return null;
        return { label, value: `${val}cm` };
    };

    const getProductMeasurements = (p: any) => {
        return [
            formatMeasurement(p.shoulder, '어깨'),
            formatMeasurement(p.chest, '가슴'),
            formatMeasurement(p.waist, '허리'),
            formatMeasurement(p.length1, '총장'),
            formatMeasurement(p.length2, '총장2'),
            formatMeasurement(p.arm_length, '소매'),
            formatMeasurement(p.hip, '힙'),
            formatMeasurement(p.thigh, '허벅지'),
            formatMeasurement(p.hem, '밑단'),
            formatMeasurement(p.rise, '밑위'),
            // 잡화
            formatMeasurement(p.acc_height, '세로'),
            formatMeasurement(p.acc_width, '가로'),
            // 가방
            formatMeasurement(p.bag_width, '너비'),
            formatMeasurement(p.bag_depth, '폭'),
            formatMeasurement(p.bag_height, '높이'),
            // 모자
            formatMeasurement(p.hat_circumference, '머리둘레'),
            formatMeasurement(p.hat_depth, '깊이'),
            formatMeasurement(p.hat_brim, '챙길이'),
            // 신발
            formatMeasurement(p.shoe_length, '발길이'),
            formatMeasurement(p.shoe_ankle, '발목높이'),
            formatMeasurement(p.shoe_width, '발볼'),
            formatMeasurement(p.shoe_heel, '굽높이'),
        ].filter(Boolean) as { label: string; value: string }[];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            <Toaster position="top-center" theme="dark" />

            {/* 헤더 */}
            <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center text-sm font-bold">
                            DB
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">공급사 원본 데이터 관리</h1>
                            <p className="text-[11px] text-slate-500">코너로지스 상품 DB 업로드 및 조회</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.close()}
                        className="text-xs text-slate-500 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition"
                    >
                        닫기
                    </button>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-6">
                <div className="grid grid-cols-12 gap-6">

                    {/* LEFT: 업로드 + 통계 */}
                    <div className="col-span-4 space-y-4">

                        {/* 업로드 카드 */}
                        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                            <h2 className="text-sm font-bold text-orange-400 mb-3 uppercase tracking-widest">엑셀 업로드</h2>
                            <p className="text-xs text-slate-400 mb-4">
                                코너로지스에서 받은 상품 엑셀 파일(.xlsx)을 업로드하세요.
                                기존 데이터와 상품코드가 같으면 자동 업데이트됩니다.
                            </p>

                            <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition ${isUploading ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/20 hover:border-orange-400/50 hover:bg-orange-500/5'}`}>
                                {isUploading ? (
                                    <>
                                        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-orange-400">업로드 중... ({uploadProgress}%)</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <span className="text-sm text-slate-400">클릭하여 엑셀 파일 선택</span>
                                        <span className="text-[10px] text-slate-600">.xlsx, .xls, .csv 지원</span>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={handleUpload}
                                    disabled={isUploading}
                                />
                            </label>

                            {uploadResult && (
                                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                    <p className="text-sm font-bold text-emerald-400 mb-1">업로드 완료</p>
                                    <div className="text-xs text-slate-300 space-y-0.5">
                                        <p>총 {uploadResult.total}개 처리</p>
                                        <p>신규 등록: <span className="text-emerald-400 font-bold">{uploadResult.inserted}</span>개</p>
                                        <p>업데이트: <span className="text-blue-400 font-bold">{uploadResult.updated}</span>개</p>
                                        {uploadResult.errors > 0 && (
                                            <p>오류: <span className="text-red-400 font-bold">{uploadResult.errors}</span>개</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 통계 카드 */}
                        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest">원본 DB 현황</h2>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : stats && stats.total > 0 ? (
                                <div className="space-y-4">
                                    {/* 주요 숫자 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-orange-400">{stats.total.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">총 상품</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-emerald-400">{stats.brands_count}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">브랜드</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-blue-400">{stats.with_measurements.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">실측 보유</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-purple-400">{Object.keys(stats.categories).length}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">카테고리</p>
                                        </div>
                                    </div>

                                    {/* 성별 분포 */}
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">성별 분포</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(stats.genders).map(([gender, count]) => (
                                                <span key={gender} className="px-2 py-1 bg-slate-800/60 rounded-lg text-[10px]">
                                                    <span className="text-slate-400">{gender}</span>
                                                    <span className="text-white font-bold ml-1">{count}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 카테고리 분포 */}
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">카테고리</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(stats.categories).slice(0, 12).map(([cat, count]) => (
                                                <span key={cat} className="px-2 py-1 bg-slate-800/60 rounded-lg text-[10px]">
                                                    <span className="text-slate-400">{cat}</span>
                                                    <span className="text-white font-bold ml-1">{count}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {stats.last_uploaded && (
                                        <p className="text-[10px] text-slate-600">
                                            마지막 업로드: {new Date(stats.last_uploaded).toLocaleString('ko-KR')}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-500">등록된 데이터가 없습니다.</p>
                                    <p className="text-xs text-slate-600 mt-1">엑셀 파일을 업로드해주세요.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: 검색 + 상세 */}
                    <div className="col-span-8 space-y-4">

                        {/* 검색 */}
                        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest">원본 데이터 검색</h2>
                            <div className="flex gap-2">
                                <select
                                    value={searchType}
                                    onChange={e => setSearchType(e.target.value as any)}
                                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                >
                                    <option value="name">상품명</option>
                                    <option value="barcode">물류바코드</option>
                                    <option value="code">상품코드</option>
                                </select>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    placeholder={searchType === 'name' ? '상품명 검색...' : searchType === 'barcode' ? '바코드 입력...' : '상품코드 입력...'}
                                    className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 rounded-lg text-sm font-bold transition"
                                >
                                    {isSearching ? '검색중...' : '검색'}
                                </button>
                            </div>

                            {/* 검색 결과 목록 */}
                            {searchResults.length > 0 && (
                                <div className="mt-4 space-y-1.5 max-h-[300px] overflow-y-auto">
                                    {searchResults.map((item: any) => {
                                        const images = JSON.parse(item.image_urls || '[]');
                                        return (
                                            <div
                                                key={item.product_code}
                                                onClick={() => setSelectedProduct(item)}
                                                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition border ${
                                                    selectedProduct?.product_code === item.product_code
                                                        ? 'bg-orange-600/20 border-orange-500/50'
                                                        : 'bg-slate-800/30 border-white/5 hover:bg-slate-800/60'
                                                }`}
                                            >
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                                                    {images[0] && <img src={images[0]} alt="" className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white font-medium truncate">{item.name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {item.brand} | {item.gender} | {item.category1} {item.category2}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[10px] text-slate-400">{item.product_code}</p>
                                                    <p className="text-[10px] text-slate-600">{item.recommended_size}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 선택된 상품 상세 */}
                        {selectedProduct && (
                            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-start gap-5">
                                    {/* 이미지 */}
                                    <div className="flex-shrink-0 space-y-2">
                                        {(() => {
                                            const images = JSON.parse(selectedProduct.image_urls || '[]');
                                            return (
                                                <>
                                                    {images[0] && (
                                                        <img src={images[0]} alt="" className="w-40 h-40 object-cover rounded-xl" />
                                                    )}
                                                    <div className="flex gap-1 flex-wrap max-w-[160px]">
                                                        {images.slice(1, 5).map((url: string, i: number) => (
                                                            <img key={i} src={url} alt="" className="w-[38px] h-[38px] object-cover rounded-lg" />
                                                        ))}
                                                        {images.length > 5 && (
                                                            <div className="w-[38px] h-[38px] bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-500">
                                                                +{images.length - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* 상세 정보 */}
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-base font-bold text-white">{selectedProduct.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                코드: {selectedProduct.product_code} | 바코드: {selectedProduct.barcode}
                                            </p>
                                        </div>

                                        {/* 기본 정보 그리드 */}
                                        <div className="grid grid-cols-4 gap-3">
                                            {[
                                                ['브랜드', `${selectedProduct.brand}${selectedProduct.brand_kr ? ` (${selectedProduct.brand_kr})` : ''}`],
                                                ['성별', selectedProduct.gender],
                                                ['카테고리', `${selectedProduct.category1} > ${selectedProduct.category2}`],
                                                ['계절', selectedProduct.season],
                                                ['표기사이즈', selectedProduct.labeled_size],
                                                ['추천사이즈', selectedProduct.recommended_size],
                                                ['기장', selectedProduct.length_type],
                                                ['소매', selectedProduct.sleeve_type],
                                                ['소재1', selectedProduct.fabric1],
                                                ['소재2', selectedProduct.fabric2],
                                                ['색상', selectedProduct.color],
                                                ['상태', selectedProduct.condition_status],
                                                ['디테일', selectedProduct.detail],
                                                ['스타일', selectedProduct.style],
                                                ['하자', selectedProduct.defect === 'Y' ? '있음' : '없음'],
                                                ['재고', selectedProduct.stock_status],
                                            ].map(([label, value]) => (
                                                <div key={label as string} className="bg-slate-800/40 rounded-lg p-2">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold">{label}</p>
                                                    <p className="text-xs text-white mt-0.5 truncate">{value || '-'}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 실측 사이즈 */}
                                        {(() => {
                                            const measurements = getProductMeasurements(selectedProduct);
                                            if (measurements.length === 0) return null;
                                            return (
                                                <div>
                                                    <p className="text-[10px] text-orange-400 uppercase font-bold mb-2">실측 사이즈 (SIZE GUIDE)</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {measurements.map(m => (
                                                            <div key={m.label} className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-center min-w-[80px]">
                                                                <p className="text-[9px] text-orange-400/60">{m.label}</p>
                                                                <p className="text-sm font-bold text-orange-400">{m.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 로고/라벨 이미지 */}
                                        {(selectedProduct.logo_image || selectedProduct.label_image) && (
                                            <div className="flex gap-3">
                                                {selectedProduct.logo_image && (
                                                    <div>
                                                        <p className="text-[9px] text-slate-500 mb-1">로고</p>
                                                        <img src={selectedProduct.logo_image} alt="logo" className="w-20 h-20 object-cover rounded-lg" />
                                                    </div>
                                                )}
                                                {selectedProduct.label_image && (
                                                    <div>
                                                        <p className="text-[9px] text-slate-500 mb-1">라벨</p>
                                                        <img src={selectedProduct.label_image} alt="label" className="w-20 h-20 object-cover rounded-lg" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 사용 가이드 */}
                        {!selectedProduct && searchResults.length === 0 && (
                            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-400 mb-2">공급사 원본 데이터 관리</h3>
                                <div className="text-xs text-slate-500 space-y-1 max-w-md mx-auto">
                                    <p>1. 좌측에서 코너로지스 엑셀 파일을 업로드합니다.</p>
                                    <p>2. 상품코드 기준으로 중복 체크 후 자동 등록/업데이트됩니다.</p>
                                    <p>3. 등록된 데이터의 실측 사이즈가 상세페이지 SIZE GUIDE에 자동 반영됩니다.</p>
                                    <p>4. 검색으로 개별 상품의 원본 데이터를 조회할 수 있습니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
