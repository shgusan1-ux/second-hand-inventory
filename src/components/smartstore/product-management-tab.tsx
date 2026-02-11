'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type VisionStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

interface Product {
  originProductNo: string;
  channelProductNo: number;
  name: string;
  salePrice: number;
  stockQuantity: number;
  regDate: string;
  statusType: string;
  sellerManagementCode?: string;
  thumbnailUrl?: string | null;
  lifecycle?: { stage: string; daysSince: number };
  archiveInfo?: { category: string };
  internalCategory?: string;
  suggestedArchiveId?: string;
  suggestionReason?: string;
  inferredBrand?: string;
  ocrText?: string;
  isApproved?: boolean;
  classification?: {
    brand: string;
    brandTier: string;
    gender: string;
    size: string;
    clothingType: string;
    clothingSubType: string;
    confidence: number;
    suggestedNaverCategory?: string;
    visionStatus?: VisionStatus;
    visionGrade?: string;
    visionColors?: string[];
  };
}

interface ProductManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

// 상품명에서 브랜드 추출: 한글 나오기 전까지 영문+특수문자 부분
function extractBrand(name: string): string {
  // "DOLCE&GABBANA 다크블루..." → "DOLCE&GABBANA"
  // "URBAN RESEARCH 어반 리서치..." → "URBAN RESEARCH"
  // "POLO RALPH LAUREN 폴로..." → "POLO RALPH LAUREN"
  const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
  return match ? match[1].trim() : name.split(' ')[0];
}

export function ProductManagementTab({ products, onRefresh }: ProductManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  // 개별 Vision 분석
  const analyzeProduct = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const id = product.originProductNo;
    if (analyzingIds.has(id)) return;

    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/smartstore/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originProductNo: id,
          name: product.name,
          imageUrl: product.thumbnailUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Vision 분석 완료: ${product.name.slice(0, 20)}...`);
        onRefresh();
      } else {
        toast.error(data.error || '분석 실패');
      }
    } catch (err: any) {
      toast.error('분석 오류: ' + err.message);
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('상품코드가 복사되었습니다: ' + text);
  };

  const statusCounts = {
    ALL: products.length,
    SALE: products.filter(p => p.statusType === 'SALE').length,
    UNCATEGORIZED: products.filter(p => p.internalCategory === 'UNCATEGORIZED').length,
    OUTOFSTOCK: products.filter(p => p.statusType === 'OUTOFSTOCK').length,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter products
  const filtered = products.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.originProductNo.includes(searchTerm) ||
      (p.sellerManagementCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchStatus = true;
    if (statusFilter === 'SALE') matchStatus = p.statusType === 'SALE';
    else if (statusFilter === 'OUTOFSTOCK') matchStatus = p.statusType === 'OUTOFSTOCK';
    else if (statusFilter === 'UNCATEGORIZED') matchStatus = p.internalCategory === 'UNCATEGORIZED';

    return matchSearch && matchStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filters or pageSize change
  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <input
        type="text"
        placeholder="상품명, 상품번호, 관리코드 검색..."
        value={searchTerm}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />

      {/* 상태 필터 - 균등 분할 */}
      <div className="grid grid-cols-4 gap-1.5">
        {Object.entries(statusCounts).map(([key, count]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 border ${statusFilter === key
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {key === 'ALL' ? '전체' : key === 'SALE' ? '판매중' : key === 'UNCATEGORIZED' ? '미분류' : '품절'}
            <span className={`ml-1 opacity-70 ${statusFilter === key ? 'text-blue-300' : 'text-slate-400'}`}>({count})</span>
          </button>
        ))}
      </div>

      {/* 선택 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between shadow-lg ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds([])} className="p-1 text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="text-sm">선택됨: <span className="text-blue-400 font-bold">{selectedIds.length}</span></span>
          </div>
          <div className="flex gap-1.5">
            <button className="px-3 py-2 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg font-bold hover:bg-emerald-500/30 transition-colors">승인</button>
            <button className="px-3 py-2 text-xs bg-slate-700 text-slate-300 rounded-lg font-bold hover:bg-slate-600 transition-colors">이동</button>
          </div>
        </div>
      )}

      {/* 결과 수 및 페이지 사이즈 선택 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-500">{filtered.length.toLocaleString()}개의 상품 목록</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">보기</span>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {[50, 100, 300, 500].map(size => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${pageSize === size ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 상품 카드 리스트 */}
      <div className="space-y-2.5">
        {paginatedItems.map(p => (
          <div
            key={p.originProductNo}
            className={`group bg-white rounded-xl border p-3 hover:shadow-md transition-all cursor-pointer ${selectedIds.includes(p.originProductNo) ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/20' : 'border-slate-100'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(p.originProductNo);
            }}
          >
            <div className="flex gap-4">
              {/* 이미지 */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-inner">
                {p.thumbnailUrl ? (
                  <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-bold">IMAGE</div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div
                      className="flex items-center gap-1 group/copy cursor-copy"
                      onClick={(e) => handleCopy(e, p.originProductNo)}
                      title="클릭하여 복사"
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-400 group-hover/copy:text-blue-500 transition-colors">
                        #{p.originProductNo}
                      </span>
                      <svg className="w-2.5 h-2.5 text-slate-300 group-hover/copy:text-blue-500 opacity-0 group-hover/copy:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-px rounded uppercase ${p.internalCategory === 'UNCATEGORIZED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {p.internalCategory}
                    </span>
                  </div>
                  {/* 판매자코드 + 등록일 */}
                  {/* 판매자코드 + 등록일 (필수 노출) */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {p.sellerManagementCode ? (
                      <span className="text-[10px] font-mono font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                        {p.sellerManagementCode}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-mono">-</span>
                    )}
                    <span className="w-px h-2.5 bg-slate-200"></span>
                    {p.regDate && (
                      <span className="text-[10px] text-slate-500 font-medium tracking-tight">
                        {new Date(p.regDate).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-slate-900 line-clamp-1 leading-tight mb-1.5">{p.name}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-extrabold text-blue-600">{p.salePrice?.toLocaleString()}원</span>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className={`text-[11px] font-bold ${p.stockQuantity === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                    재고 {p.stockQuantity}
                  </span>

                  {p.lifecycle && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black tracking-tighter ${p.lifecycle.stage === 'NEW' ? 'bg-emerald-500 text-white' :
                      p.lifecycle.stage === 'CURATED' ? 'bg-indigo-500 text-white' :
                        p.lifecycle.stage === 'ARCHIVE' ? 'bg-slate-800 text-white' :
                          'bg-amber-500 text-white'
                      }`}>
                      {p.lifecycle.stage}
                    </span>
                  )}

                  {/* Vision 상태 배지 */}
                  {p.classification?.visionStatus === 'completed' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {p.classification.visionGrade || 'A급'}
                    </span>
                  ) : p.classification?.visionStatus === 'processing' || analyzingIds.has(p.originProductNo) ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 animate-pulse">
                      분석중
                    </span>
                  ) : p.thumbnailUrl ? (
                    <button
                      onClick={(e) => analyzeProduct(e, p)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600 transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      분석
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* AI 다차원 분류 결과 */}
            {p.classification && (
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">AI 다차원 분류</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.classification.confidence >= 70 ? 'bg-emerald-500' : p.classification.confidence >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${p.classification.confidence}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black ${p.classification.confidence >= 70 ? 'text-emerald-600' : p.classification.confidence >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {p.classification.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* 브랜드 + 티어 */}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${p.classification.brandTier === 'LUXURY' ? 'bg-purple-100 text-purple-800' :
                        p.classification.brandTier === 'PREMIUM' ? 'bg-indigo-100 text-indigo-700' :
                          p.classification.brandTier === 'DESIGNER' ? 'bg-blue-100 text-blue-700' :
                            p.classification.brandTier === 'CONTEMPORARY' ? 'bg-cyan-100 text-cyan-700' :
                              p.classification.brandTier === 'SPORTSWEAR' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-600'
                      }`}>
                      {p.classification.brand || extractBrand(p.name)}
                      <span className="opacity-60 text-[8px]">{p.classification.brandTier}</span>
                    </span>

                    {/* 의류 타입 */}
                    {p.classification.clothingType !== 'UNKNOWN' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                        {p.classification.clothingType === 'OUTERWEAR' ? '아우터' :
                          p.classification.clothingType === 'TOPS' ? '상의' :
                            p.classification.clothingType === 'BOTTOMS' ? '하의' :
                              p.classification.clothingType === 'DRESS' ? '원피스' : '기타'}
                        {p.classification.clothingSubType !== 'UNKNOWN' && (
                          <span className="text-[8px] opacity-70">{p.classification.clothingSubType}</span>
                        )}
                      </span>
                    )}

                    {/* 성별 */}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.classification.gender === 'MAN' ? 'bg-blue-100 text-blue-700' :
                        p.classification.gender === 'WOMAN' ? 'bg-pink-100 text-pink-700' :
                          p.classification.gender === 'KIDS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-500'
                      }`}>
                      {p.classification.gender === 'MAN' ? 'M' : p.classification.gender === 'WOMAN' ? 'W' : p.classification.gender === 'KIDS' ? 'K' : '-'}
                      {p.classification.size && p.classification.size !== 'FREE' && (
                        <span className="ml-0.5 opacity-70">/{p.classification.size}</span>
                      )}
                    </span>
                  </div>

                  {/* 네이버 카테고리 제안 */}
                  {p.classification.suggestedNaverCategory && (
                    <p className="text-[9px] text-slate-400 truncate">
                      <span className="font-bold text-blue-500">네이버</span> {p.classification.suggestedNaverCategory}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 페이지네이션 하단 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="flex items-center gap-1">
            {/* Simple range of pages around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p className="text-sm font-bold text-slate-400">
            {searchTerm ? '검색 결과가 없습니다.' : '표시할 상품이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
