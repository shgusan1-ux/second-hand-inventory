'use client';

import { useState, useMemo, useEffect } from 'react';
import { processImageWithBadge } from '@/lib/image-processor';
import { toast } from 'sonner';

interface Product {
  originProductNo: string;
  name: string;
  thumbnailUrl?: string | null;
  salePrice: number;
  regDate?: string;
  lifecycle?: { stage: string; daysSince: number };
  classification?: {
    visionGrade?: string;
    brand?: string;
    clothingType?: string;
    confidence?: number;
    [key: string]: any;
  };
  images?: any;
  channelProductNo?: number;
}

interface ImageManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

export function ImageManagementTab({ products: initialProducts, onRefresh }: ImageManagementTabProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'ALL' | 'NO_IMAGE' | 'NO_BADGE'>('ALL');
  const [logs, setLogs] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 60 : 50;
  const [isMounted, setIsMounted] = useState(false);
  const [showBulkSearch, setShowBulkSearch] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkCodes, setBulkCodes] = useState<Set<string>>(new Set());

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  // Verify component version
  useEffect(() => {
    setIsMounted(true);
    console.log('[ImageManagementTab] Loaded v2.3: Fix hydration & initialization');
    addLog('[System] Component v2.3 Loaded. Ready.');
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    setProducts(initialProducts);
    setPage(1); // Reset page on refresh/update
  }, [initialProducts]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [filterType, searchTerm, viewMode]);

  const filtered = useMemo(() => {
    let result = products;

    if (filterType === 'NO_IMAGE') {
      result = result.filter(p => !p.thumbnailUrl);
    } else if (filterType === 'NO_BADGE') {
      result = result.filter(p => {
        const hasGrade = !!(p.classification?.visionGrade || (p as any).descriptionGrade);
        const hasAIBadge = !!p.classification?.hasBadge;
        const isBadgeSynced = p.thumbnailUrl?.includes('/thumbnails/generated/') || p.thumbnailUrl?.includes('vercel-storage.com');
        return hasGrade && p.thumbnailUrl && !isBadgeSynced && !hasAIBadge;
      });
    }

    if (bulkCodes.size > 0) {
      return result.filter(p => bulkCodes.has(p.originProductNo));
    }

    if (!searchTerm) return result;
    return result.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.originProductNo.includes(searchTerm)
    );
  }, [products, searchTerm, filterType, bulkCodes]);

  const getImageUrl = (p: Product): string | null => {
    return p.thumbnailUrl || null;
  };

  const getImageCount = (p: Product): number => {
    return p.thumbnailUrl ? 1 : 0;
  };

  const noImageCount = products.filter(p => !p.thumbnailUrl).length;
  const noBadgeCount = products.filter(p => {
    const hasGrade = !!(p.classification?.visionGrade || (p as any).descriptionGrade);
    const hasAIBadge = !!p.classification?.hasBadge;
    const isBadgeSynced = p.thumbnailUrl?.includes('/thumbnails/generated/') || p.thumbnailUrl?.includes('vercel-storage.com');
    return hasGrade && p.thumbnailUrl && !isBadgeSynced && !hasAIBadge;
  }).length;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    return filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(p => p.originProductNo));
  };

  const handleGenerateThumbnails = async () => {
    if (selectedIds.length === 0) return;

    setLogs([]); // Clear logs on new run
    addLog(`----------------------------------------`);
    addLog(`[Start] Processing ${selectedIds.length} items`);
    setGenerating(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      addLog(`[Item: ${id}] Checking product data...`);
      const product = products.find(p => p.originProductNo === id);

      if (!product) {
        addLog(`[Item: ${id}] Error: Product not found in local state`);
        continue;
      }

      if (!product.thumbnailUrl) {
        addLog(`[Item: ${id}] Error: No Thumbnail URL found`);
        failCount++;
        continue;
      }

      // Default fallback grade logic if descriptionGrade is missing
      const grade = (product as any).descriptionGrade || product.classification?.visionGrade || 'B';
      const loadingToast = toast.loading(`${id} 이미지 처리 중...`);

      try {
        addLog(`[Item: ${id}] Processing Image (Grade: ${grade})...`);
        addLog(`[Item: ${id}] URL: ${product.thumbnailUrl}`);

        // 1. Client-Side Processing
        const blob = await processImageWithBadge({
          imageUrl: product.thumbnailUrl,
          grade: grade
        });

        addLog(`[Item: ${id}] Generated Blob: ${blob.size} bytes (${blob.type})`);

        // 2. Upload Result
        const formData = new FormData();
        formData.append('file', blob, `${id}.jpg`);
        formData.append('productNo', String(id));

        // Debug Log
        addLog(`[Item: ${id}] Checking FormData... file=${(formData.get('file') as Blob)?.size}, productNo=${formData.get('productNo')}`);

        addLog(`[Item: ${id}] Uploading to server...`);
        const uploadResp = await fetch('/api/smartstore/images/upload', {
          method: 'POST',
          body: formData
        });

        const statusText = `${uploadResp.status} ${uploadResp.statusText}`;
        addLog(`[Item: ${id}] Upload Response: ${statusText}`);

        toast.dismiss(loadingToast);


        if (uploadResp.ok) {
          const data = await uploadResp.json();
          // Define newUrl here so it's available for the Naver update
          const newUrl = data.url ? `${data.url}?t=${Date.now()}` : `/thumbnails/generated/${id}.jpg?t=${Date.now()}`;

          // 3. Naver Update (New Step)
          addLog(`[Item: ${id}] Updating Naver Image...`);

          let naverSuccess = false;
          try {
            const updateRes = await fetch('/api/smartstore/products/update-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                originProductNo: id,
                imageUrl: newUrl
              })
            });

            const resData = await updateRes.json();
            if (!updateRes.ok) {
              // 서버 로그도 함께 표시
              if (resData.logs) resData.logs.forEach((l: string) => addLog(`  [서버] ${l}`));
              throw new Error(`Naver Update Failed: ${resData.error || updateRes.statusText}`);
            }
            // 성공 시에도 서버 로그 표시
            if (resData.logs) resData.logs.forEach((l: string) => addLog(`  [서버] ${l}`));
            naverSuccess = true;
          } catch (naverErr: any) {
            addLog(`[Item: ${id}] Naver Update Error: ${naverErr.message}`);
            toast.error(`${id} 이미지는 생성됐으나 네이버 전송 실패`);
          }

          if (naverSuccess) {
            addLog(`[Item: ${id}] Naver Image Updated Successfully! ✓`);
            toast.success(`${id} Naver 동기화 완료`);
          } else {
            // naverErr cases are handled in catch, but if it fell through
            addLog(`[Item: ${id}] Warning: Uploaded but Naver sync might have failed.`);
          }

          successCount++;
          setProducts(prev => prev.map(p =>
            p.originProductNo === id ? { ...p, thumbnailUrl: newUrl } : p
          ));
        } else {
          const errorText = await uploadResp.text();
          addLog(`[Item: ${id}] Upload FAILED: ${errorText}`);
          console.error(`[ImageTab] Upload Failed for ${id}:`, errorText);
          failCount++;
          toast.error(`${id} 업로드 실패: ${errorText}`);
        }

      } catch (e: any) {
        toast.dismiss(loadingToast);
        addLog(`[Item: ${id}] EXCEPTION: ${e.message}`);
        console.error(`[ImageTab] Error processing ${id}:`, e);
        toast.error(`${id} 처리 오류 (로그 확인)`);
        failCount++;
      }
    }

    addLog(`[Finish] Success: ${successCount}, Fail: ${failCount}`);
    setGenerating(false);

    if (successCount > 0) {
      toast.success(`총 ${successCount}개 썸네일 생성 완료!`);
      setSelectedIds([]);
    }
  };


  // Override console.log/error locally for this component scope? 
  // Better to just call addLog inside handleGenerateThumbnails.
  // We need to pass addLog to processImageWithBadge or capture logs there.
  // For now, let's just log main steps in handleGenerateThumbnails.

  return (
    <div className="space-y-4">
      {/* ... (Previous UI code) ... */}

      {/* Logs Panel */}
      <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-xs max-h-60 overflow-y-auto mb-4">
        <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
          <span className="font-bold">Process Logs</span>
          <button onClick={() => setLogs([])} className="text-slate-400 hover:text-white">Clear</button>
        </div>
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">Ready to process...</div>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterType('ALL')}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${filterType === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900 ring-offset-2' : 'bg-white hover:bg-slate-50'}`}
        >
          <p className={`text-xs ${filterType === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>전체 상품</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div
          onClick={() => setFilterType('NO_IMAGE')}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${filterType === 'NO_IMAGE' ? 'bg-red-900 text-white border-red-900 shadow-md ring-2 ring-red-900 ring-offset-2' : 'bg-white hover:bg-red-50'}`}
        >
          <p className={`text-xs ${filterType === 'NO_IMAGE' ? 'text-red-200' : 'text-red-400'}`}>이미지 없음</p>
          <p className={`text-2xl font-bold ${filterType === 'NO_IMAGE' ? 'text-white' : 'text-red-600'}`}>{noImageCount}</p>
        </div>
        <div
          onClick={() => setFilterType('NO_BADGE')}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${filterType === 'NO_BADGE' ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-600 ring-offset-2' : 'bg-white hover:bg-orange-50'}`}
        >
          <p className={`text-xs ${filterType === 'NO_BADGE' ? 'text-orange-100' : 'text-orange-400'}`}>썸네일 뱃지 없음</p>
          <p className={`text-2xl font-bold ${filterType === 'NO_BADGE' ? 'text-white' : 'text-orange-600'}`}>{noBadgeCount}</p>
          <p className={`text-[9px] mt-1 ${filterType === 'NO_BADGE' ? 'text-orange-100' : 'text-slate-400'}`}>합성 및 전송 필요</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">보기 모드</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-xs font-medium ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              그리드
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-xs font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              리스트
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleSelectAll}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 shrink-0"
        >
          {selectedIds.length === filtered.length && filtered.length > 0 ? '전체 해제' : '전체 선택'}
        </button>
        <input
          type="text"
          placeholder="상품 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          disabled={bulkCodes.size > 0}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        />
        {bulkCodes.size > 0 ? (
          <button
            onClick={() => { setBulkCodes(new Set()); setBulkText(''); }}
            className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 shrink-0"
          >
            대량검색 해제 ({bulkCodes.size}개)
          </button>
        ) : (
          <button
            onClick={() => setShowBulkSearch(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shrink-0"
          >
            대량검색
          </button>
        )}
        {selectedIds.length > 0 && (
          <button
            onClick={handleGenerateThumbnails}
            disabled={generating}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            썸네일 등록 ({selectedIds.length})
          </button>
        )}
      </div>

      {/* 이미지 그리드 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {paginatedProducts.map(p => {
            const imgUrl = getImageUrl(p);
            const imgCount = getImageCount(p);
            const isSelected = selectedIds.includes(p.originProductNo);
            const salesLink = p.channelProductNo ? `https://smartstore.naver.com/brownstreet/products/${p.channelProductNo}` : null;

            return (
              <div
                key={p.originProductNo}
                className={`bg-white rounded-xl border overflow-hidden transition-all cursor-pointer group relative ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
                onClick={() => toggleSelect(p.originProductNo)}
              >
                <div className="aspect-square bg-slate-100 relative group-hover:opacity-90 transition-opacity">
                  <div className="absolute top-2 left-2 z-20" onClick={(e) => toggleSelect(p.originProductNo, e)}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }} // Handled by group click
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                    />
                  </div>

                  {/* Image Display */}
                  <div className="w-full h-full">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {imgCount > 1 && (
                    <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">
                      {imgCount}장
                    </span>
                  )}

                  {/* Link Button (Magnifying Glass Icon) */}
                  {salesLink && (
                    <a
                      href={salesLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="판매 페이지 보기"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}

                  {/* Optional: Detail view can be kept as a small sub-icon if needed, but user didn't ask */}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{p.salePrice?.toLocaleString()}원</span>
                    {isMounted && p.regDate && <span className="text-[8px] text-slate-300">{new Date(p.regDate).toLocaleDateString('ko-KR')}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-16 p-3"></th>
                <th className="text-left p-3 text-slate-500 text-xs font-medium">상품</th>
                <th className="text-center p-3 text-slate-500 text-xs font-medium w-20">이미지 수</th>
                <th className="text-right p-3 text-slate-500 text-xs font-medium w-24">가격</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(p => (
                <tr key={p.originProductNo} className={`border-b hover:bg-slate-50 cursor-pointer ${selectedIds.includes(p.originProductNo) ? 'bg-blue-50/50' : ''}`} onClick={() => setSelectedProduct(p)}>
                  <td className="p-3 text-center" onClick={(e) => toggleSelect(p.originProductNo, e)}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.originProductNo)}
                      readOnly
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                      {getImageUrl(p) && <img src={getImageUrl(p)!} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{p.originProductNo}</span>
                      {isMounted && p.regDate && <span className="text-[10px] text-slate-300">{new Date(p.regDate).toLocaleDateString('ko-KR')}</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">{getImageCount(p)}</td>
                  <td className="p-3 text-right font-medium text-slate-700">{p.salePrice?.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 10) {
                if (page > 6) {
                  pageNum = page - 5 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (9 - i);
                }
              }
              if (pageNum <= 0 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${page === pageNum
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {pageNum}
                </button>
              );
            }).filter(Boolean)}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="w-full text-center mt-2 text-xs text-slate-400 font-medium font-mono">
            {page} / {totalPages} (Total {filtered.length})
          </div>
        </div>
      )}

      {/* 대량검색 모달 */}
      {showBulkSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBulkSearch(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-800">상품코드 대량 검색</h2>
              <button onClick={() => setShowBulkSearch(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-slate-500">상품코드를 붙여넣기 하세요. (줄바꿈, 쉼표, 공백, 탭으로 구분)</p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"82945286614\n82945286615\n82945286616\n..."}
              rows={10}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {bulkText.trim() ? `${bulkText.trim().split(/[\n,\s\t]+/).filter(Boolean).length}개 코드 감지` : '코드를 입력하세요'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkSearch(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const codes = bulkText.trim().split(/[\n,\s\t]+/).map(c => c.trim()).filter(Boolean);
                    if (codes.length === 0) { alert('상품코드를 입력하세요'); return; }
                    setBulkCodes(new Set(codes));
                    setSearchTerm('');
                    setShowBulkSearch(false);
                    addLog(`[대량검색] ${codes.length}개 상품코드로 필터링`);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700"
                >
                  검색 적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 상세 모달 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-slate-800 truncate">{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.isArray(selectedProduct.images) ? (
                selectedProduct.images.map((img: any, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <>
                  {selectedProduct.images?.representativeImage && (
                    <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden col-span-2">
                      <img src={selectedProduct.images.representativeImage.url} alt="대표 이미지" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {selectedProduct.images?.optionalImages?.map((img: any, i: number) => (
                    <div key={i} className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </>
              )}
            </div>
            {getImageCount(selectedProduct) === 0 && (
              <div className="text-center py-12 text-slate-400">이미지가 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
